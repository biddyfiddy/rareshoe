const express = require("express");
const path = require("path")
const web3 = require("web3")
const crypto = require("crypto")
const ethers = require("ethers")
const axios = require("axios")
const app = express();
const port = process.env.PORT || 3001;

const WALLET_KEY = process.env.WALLET_KEY;
const ETHER_API_KEY = process.env.ETHER_API_KEY;
const ETHER_NETWORK = process.env.ETHER_NETWORK;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

const rs20Address = require('./src/abi/rs20.json').address;
const capsulesAddress = require('./src/abi/capsules.json').address;
const capsulesAbi = require('./src/abi/capsules.json').abi;
const whitelist = require('./src/whitelist/list.json');


const web3Instance = new web3(process.env.MAINNET_RPC_URL);

const generateNonce = () => {
    return crypto.randomBytes(16).toString("hex");
};

const mintMsgHash = (recipient, blueAmount, redAmount, yellowAmount, newNonce, contract) => {
    return (
        web3Instance.utils.soliditySha3(
            { t: "address", v: recipient },
            { t: "uint256", v: blueAmount },
            { t: "uint256", v: redAmount },
            { t: "uint256", v: yellowAmount },
            { t: "string", v: newNonce },
            { t: "address", v: contract }
        ) || ""
    );
};

const signMessage = (msgHash, privateKey) => {
    return web3Instance.eth.accounts.sign(msgHash, privateKey);
};

const signing = (address, blueAmount, redAmount, yellowAmount) => {
    const newNonce = generateNonce();

    const hash = mintMsgHash(
        address,
        blueAmount,
        redAmount,
        yellowAmount,
        newNonce,
        rs20Address
    );

    const signner = signMessage(hash, WALLET_KEY);

    return {
        blueAmount: blueAmount,
        redAmount: redAmount,
        yellowAmount: yellowAmount,
        nonce: newNonce,
        hash: signner.message,
        signature: signner.signature,
    };

}

const getItem = (address, list) => {
    return list.filter(listItem => {
        return listItem.address === address;
    })[0];
}

const updateItem = (address, list, red, blue, yellow) => {
   list.forEach(listItem => {
       if (listItem.address === address) {
           listItem.red = red;
           listItem.blue = blue;
           listItem.yellow = yellow;
       }
   });
}

app.post("/holders", async (req, res) => {

    let provider = new ethers.providers.EtherscanProvider("mainnet", ETHER_API_KEY);

    let contract = new ethers.Contract(
        capsulesAddress,
        capsulesAbi,
        provider,
    );

    let total = await contract.totalSupply().catch(err => {
        return;
    });

    let totalRed = 0;
    let totalYellow = 0;
    let totalBlue = 0;

    let list = []

    for (let i = 0; i < total; i++) {
        let owner = await contract.ownerOf(i).catch(err => {
            // no op
        });

        let uri = await contract.tokenURI(i)

        let item = getItem(owner, list);

        let red = 0;
        let yellow = 0;
        let blue = 0;

        if (item) {
            red = item.red;
            yellow = item.yellow;
            blue = item.blue;
        }

        console.log(`${i}: ${owner}, red: ${red}, blue : ${blue}, yellow: ${yellow}`);

        await axios.get(uri.replace("ipfs://", "https://slimeball.mypinata.cloud/ipfs/")).then(response => {
            let color = response.data.color;
            if (color === 'blue') {
                blue = blue + 1;
                totalBlue++;
            } else if (color === 'yellow') {
                yellow = yellow + 1;
                totalYellow++;
            } else if (color === 'red') {
                red = red + 1;
                totalRed++;
            }
        }).catch(err => {
            console.log(err);
        });

        if (item) {
            updateItem(owner, list, red, blue, yellow);
        } else {
            list.push({ address : owner, blue: blue, red: red, yellow : yellow})
        }

    }

    list.forEach(listItem => {
        console.log(listItem);
    })
    console.log({ totalRed, totalYellow, totalBlue, total: (totalBlue + totalRed + totalYellow)});
    res.status(200).json(list);
});

app.post("/capsules", async (req, res) => {
    const body = req.body
    if (!body || !body.address) {
        res.status(500).json({
            message: "You fucked up the post body."
        })
        return;
    }

    const address = body.address.toLowerCase()
    if (!address) {
        res.status(500).json({
            message: "No address supplied"
        })
        return;
    }

    let capsuleInfo = whitelist.filter(wallet => {
        return wallet.address.toLowerCase() === address;
    });

    if (capsuleInfo.length === 1) {
        res.status(200).json(capsuleInfo[0]);
    } else {
        res.status(500).json({ message: "Wallet was not found in white list.  Do you have capsules?"});
    }
});

app.post("/mint", async (req, res) => {
    const body = req.body
    if (!body) {
        res.status(500).json({
            message: "No post body"
        })
        return;
    }

    if (!body.walletAddress) {
        return res.status(500).json("Request was malformed")
    }

    let walletAddress = body.walletAddress.toLowerCase();

    let capsuleInfo = whitelist.filter(wallet => {
        return wallet.address.toLowerCase() === walletAddress;
    });


    if (capsuleInfo.length !== 1) {
        return res.status(500).json({ message: "Could not find wallet"});
    }

    let capsule = capsuleInfo[0];

    let sign = signing(walletAddress, capsule.blue, capsule.red, capsule.yellow);
    res.status(200).json(sign);

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
