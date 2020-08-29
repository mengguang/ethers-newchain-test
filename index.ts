let mock = require("mock-require");
mock("@ethersproject/signing-key","./signing-key");

import ethers = require("ethers");
import fs = require("fs");
import readlineSync = require("readline-sync");

const rpc_url: string = "https://rpc2.newchain.cloud.diynova.com";
const provider = new ethers.providers.JsonRpcProvider(rpc_url);

function delay(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function pretty_balance(balance) {
    return ethers.utils.formatEther(balance);
}

async function do_work() {
    const keystore = fs.readFileSync("a4d79e4efecd77ba0e1b6551388a7d7c0778824a.json", 'utf8');
    //const password = readlineSync.question("keystore password: ", {hideEchoBack: true});
    const password = '123qwe';
    let wallet: ethers.ethers.Wallet = null;
    try {
        wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
    } catch (err) {
        console.log(err);
        return;
    }
    console.log(`Wallet Address: ${wallet.address}`);
    const signer = wallet.connect(provider);

    const network = await provider.getNetwork();
    console.log(`Network: ${network.chainId}`);
    const gasPrice = await provider.getGasPrice();
    console.log(`Gas Price: ${gasPrice.toString()}`);
    const blockNumber = await provider.getBlockNumber();
    console.log(`blockNumber: ${blockNumber}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance of ETH: ${pretty_balance(balance)}`);

    let tx = {
        to: "0x29e9356eC2082f447a7F747bF8D83c35E858fb86",
        value: ethers.utils.parseEther("2.0")
    }

    let response = await signer.sendTransaction(tx);
    console.log(response);
    console.log(`Transaction hash: ${response.hash}`);

    console.log("Waiting for transaction receipt...");
    const receipt = await provider.waitForTransaction(response.hash);
    if (receipt != null) {
        console.log(receipt);
        console.log("Got transaction receipt:");
        console.log(`Transaction blockNumber: ${receipt.blockNumber}`);
        console.log(`Transaction confirmations: ${receipt.confirmations}`);
        console.log(`Transaction status: ${receipt.status}`);
    }
}

do_work().catch(err => {
    console.log(err)
});



