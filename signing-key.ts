"use strict";

import { ec as EC } from "elliptic";

import { arrayify, BytesLike, hexlify, hexZeroPad, Signature, SignatureLike, splitSignature } from "@ethersproject/bytes";
import { defineReadOnly } from "@ethersproject/properties";

import { Logger } from "@ethersproject/logger";

const version = "newchain-signing-key/1.0.0";
const logger = new Logger(version);

let _curve: EC = null
function getCurve() {
    if (!_curve) {
        _curve = new EC("p256");
    }
    return _curve;
}

export class SigningKey {

    readonly curve: string;

    readonly privateKey: string;
    readonly publicKey: string;
    readonly compressedPublicKey: string;

    //readonly address: string;

    readonly _isSigningKey: boolean;

    constructor(privateKey: BytesLike) {
        defineReadOnly(this, "curve", "p256");

        defineReadOnly(this, "privateKey", hexlify(privateKey));

        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));

        defineReadOnly(this, "publicKey", "0x" + keyPair.getPublic(false, "hex"));
        defineReadOnly(this, "compressedPublicKey", "0x" + keyPair.getPublic(true, "hex"));

        defineReadOnly(this, "_isSigningKey", true);
    }

    _addPoint(other: BytesLike): string {
        const p0 =  getCurve().keyFromPublic(arrayify(this.publicKey));
        const p1 =  getCurve().keyFromPublic(arrayify(other));
        return "0x" + p0.pub.add(p1.pub).encodeCompressed("hex");
    }

    signDigest(digest: BytesLike): Signature {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const signature = keyPair.sign(arrayify(digest), { canonical: true });
        return splitSignature({
            recoveryParam: signature.recoveryParam,
            r: hexZeroPad("0x" + signature.r.toString(16), 32),
            s: hexZeroPad("0x" + signature.s.toString(16), 32),
        })
    }

    computeSharedSecret(otherKey: BytesLike): string {
        const keyPair = getCurve().keyFromPrivate(arrayify(this.privateKey));
        const otherKeyPair = getCurve().keyFromPublic(arrayify(computePublicKey(otherKey)));
        return hexZeroPad("0x" + keyPair.derive(otherKeyPair.getPublic()).toString(16), 32);
    }

    static isSigningKey(value: any): value is SigningKey {
        return !!(value && value._isSigningKey);
    }
}

export function recoverPublicKey(digest: BytesLike, signature: SignatureLike): string {
    const sig = splitSignature(signature);
    const rs = { r: arrayify(sig.r), s: arrayify(sig.s) };
    return "0x" + getCurve().recoverPubKey(arrayify(digest), rs, sig.recoveryParam).encode("hex", false);
}

export function computePublicKey(key: BytesLike, compressed?: boolean): string {
    const bytes = arrayify(key);

    if (bytes.length === 32) {
        const signingKey = new SigningKey(bytes);
        if (compressed) {
            return "0x" + getCurve().keyFromPrivate(bytes).getPublic(true, "hex");
        }
        return signingKey.publicKey;

    } else if (bytes.length === 33) {
        if (compressed) { return hexlify(bytes); }
        return "0x" + getCurve().keyFromPublic(bytes).getPublic(false, "hex");

    } else if (bytes.length === 65) {
        if (!compressed) { return hexlify(bytes); }
        return "0x" + getCurve().keyFromPublic(bytes).getPublic(true, "hex");
    }

    return logger.throwArgumentError("invalid public or private key", "key", "[REDACTED]");
}

