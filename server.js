const express = require("express");
const path = require("path")
const app = express();
const port = process.env.PORT || 3001;
const axios = require("axios")
const {ethers} = require("ethers");

const og1Json = require('./src/abi/og1.json');
const {abi: legacyAbi, legacyByteCode, address: legacyAddress} = require("./src/abi/legacy.json");

const og1Address = og1Json.address.toLowerCase();
const og1TokenIds = og1Json.tokenIds;

const capsulesJson = require('./src/abi/capsules.json');

const capsulesAddress = capsulesJson.address.toLowerCase();
const capsulesAbi = capsulesJson.abi;
const capsulesBytecode = capsulesJson.bytecode;

const redJson = require('./src/capsules/red.json');
const blueJson = require('./src/capsules/blue.json');
const yellowJson = require('./src/capsules/yellow.json');


const og2Address = require('./src/abi/og1.json').address.toLowerCase();

const API_KEY = process.env.ETHER_API_KEY;
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const WALLET_KEY = process.env.WALLET_KEY;
const ETHER_NETWORK = process.env.ETHER_NETWORK;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));


/*
const og1TokenIds = ["325641",
"325698",
    "333467",
    "348852",
    "348917",
    "348924",
    "349335",
    "397383",
    "435679",
    "435684",
    "465384",
    "514381",
    "517397",
    "542091",
    "564859",
    "585044",
    "636714",
    "636718"];

const og2TokenIds = [
    "76897645978672858115504195217152888562815429950311142221661744562366169743361",
    "76897645978672858115504195217152888562815429950311142221661744552470565093377",
    "76897645978672858115504195217152888562815429950311142221661744564565192998913",
    "76897645978672858115504195217152888562815429950311142221661744559067634860033",
    "76897645978672858115504195217152888562815429950311142221661744561266658115585",
    "76897645978672858115504195217152888562815429950311142221661744560167146487809",
    "76897645978672858115504195217152888562815429950311142221661744563465681371137",
    "76897645978672858115504195217152888562815429950311142221661744551371053465601",
    "76897645978672858115504195217152888562815429950311142221661744554669588348929",
    "76897645978672858115504195217152888562815429950311142221661744557968123232257",
    "76897645978672858115504195217152888562815429950311142221661744555769099976705",
    "76897645978672858115504195217152888562815429950311142221661744566764216254465",
    "76897645978672858115504195217152888562815429950311142221661744556868611604481",
    "76897645978672858115504195217152888562815429950311142221661744553570076721153",
    "76897645978672858115504195217152888562815429950311142221661744565664704626689"
];
*/

// TODO validate payloads

const config = {
    headers: {
        'Content-Type': 'application/json',
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_KEY,
        "Host": "api.pinata.cloud"
    }
}

const getAllowedCapsules = async (toAddress, fromAddress) => {
    let genesisBurned = await getNumBurned(toAddress, fromAddress, legacyAddress.toLowerCase());
    let og1Burned = await getNumBurned(toAddress, fromAddress, og1Address.toLowerCase());
    let og2Burned = await getNumBurned(toAddress, fromAddress, og2Address.toLowerCase());
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, toAddress);
    return new Promise((resolve, reject) => {
        resolve(genesisBurned.numBurns + (og1Burned.numBurns * 2) + (og2Burned.numBurns * 2) - numCapsulesHeld);
    });
}

const getNumCapsulesAndTypes = async (address) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const contract = new ethers.Contract(capsulesAddress, capsulesAbi, provider);

    let total = await contract.totalSupply().catch(err => {
        return;
    });


    let red = 0;
    let yellow = 0;
    let blue = 0;

    for (let i = 0; i < total; i++) {
        let owner = await contract.ownerOf(i).catch(err => {
            // no op
        });
        if (owner.toString().toLowerCase() === address) {
            let uri = await contract.tokenURI(i)
            await axios.get(uri, config).then(response => {
                let data = response.data;
                let color = data.color;
                if (color) {
                    if (color === "red") {
                        red++;
                    } else if (color === "blue") {
                        blue++;
                    } else if (color === "yellow") {
                        yellow++;
                    }
                }
            }).catch(err => {
                console.log(err);
            });
        }
    }

    return new Promise((resolve, reject) => {
        resolve({
            "red": red,
            "yellow": yellow,
            "blue": blue,
            "total": red + yellow + blue
        });
    });
};

const getNumBurned = async (toAddress, fromAddress, contractAddress) => {
    console.log(`Getting amount of ${contractAddress} burned for ${toAddress}`);
    let network = ETHER_NETWORK === 'mainnet' ? '' : `-${ETHER_NETWORK}`;

    return axios.get(`https://api${network}.etherscan.io/api?module=account&action=tokennfttx&address=${toAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${API_KEY}`).then(response => {
        let responseData = response.data;
        let burns = responseData.result;
        let numBurns = 0;
        burns.forEach(burn => {
            if (burn.contractAddress === og1Address) {
                if (og1TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.contractAddress === og2Address) {
                if (og2TokenIds.includes(burn.tokenID) && burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                    numBurns++;
                }
            } else if (burn.from === fromAddress && burn.to === toAddress && contractAddress === burn.contractAddress) {
                numBurns++;
            }
        })
        return {
            numBurns: numBurns
        };
    }).catch(err => {
        console.log(err);
    });
};

const getNumHeld = async (contractAddress, contractAbi, walletAddress) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);

    return await contract.balanceOf(walletAddress).then(data => {
        return data.toString();
    })
}

const getRandomCapsuleColor = () => {
    const randomNumber = Math.floor(Math.random() * 3);
    let nftJson;
    switch (randomNumber) {
        // Red
        case 0:
            nftJson = redJson;
            break;
        // Blue
        case 1:
            nftJson = blueJson;
            break;
        // Yellow
        case 2:
            nftJson = yellowJson;
            break;
    }
    return nftJson;
}

const pinDataToPinata = async (nftJson) => {
    console.log("Pinning data to pinata")
    let tokenUri;
    return axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", JSON.stringify(nftJson), config).then(response => {
        if (response && response.data && response.data.IpfsHash) {
            return response.data.IpfsHash;
        }
    }).catch(error => {
        console.log(error);
    })
};

const mintToken = async (toAddress, tokenUri) => {
    let provider = new ethers.providers.EtherscanProvider(ETHER_NETWORK, API_KEY);
    const wallet = new ethers.Wallet(WALLET_KEY, provider);

    const nonce = await wallet.getTransactionCount()
    const gasFeePromise = await provider.getFeeData();
    const gasFee = gasFeePromise.gasPrice;

    const contractInstance = new ethers.Contract(capsulesAddress, capsulesAbi, provider)

    let rawTxn = await contractInstance.populateTransaction.burnMint(toAddress, tokenUri, {
        gasPrice: gasFee,
        nonce: nonce
    })

    console.log("Submitting transaction with gas price of:", ethers.utils.formatUnits(gasFee, "gwei") + " wei");
    let signedTxn = await wallet.sendTransaction(rawTxn)
    return signedTxn.wait().then(reciept => {

        if (reciept) {
            return signedTxn.hash;
        } else {
            console.log("Error submitting transaction")
        }
    });
};

app.post("/token", async (req, res) => {
    const body = req.body
    const uri = body.uri;

    await axios.get(uri).then(response => {
        return res.status(200).json(response.data)
    }).catch(
        function (error) {
            console.log(error)
            res.status(500).json({
                message: "Could not get information for token"
            })

        }
    )
});

app.post("/inquiry", async (req, res) => {

    const body = req.body
    const toAddress = body.toAddress.toLowerCase()
    const fromAddress = body.fromAddress.toLowerCase()
    const contractAddress = body.contractAddress.toLowerCase()

    let numBurned = await getNumBurned(toAddress, fromAddress, contractAddress);

    if (numBurned) {
        res.status(200).json(numBurned);
    } else {
        res.status(500).json({message: "Could not get information for token"})
    }
});

app.post("/capsules", async (req, res) => {
    const body = req.body
    const address = body.address.toLowerCase()
    let response = await getNumCapsulesAndTypes(address);
    if (response) {
        res.status(200).json(response);
    } else {
        res.status(500);
    }
});

app.post("/allowed", async (req, res) => {
    const body = req.body
    const toAddress = body.toAddress.toLowerCase()
    const fromAddress = body.fromAddress.toLowerCase()
    const allowed = await getAllowedCapsules(toAddress, fromAddress);
    if (allowed) {
        res.status(200).json({allowed});
    } else {
        res.status(200).json({allowed: 0});
    }
});

app.post("/mintBurn", async (req, res) => {
    const body = req.body
    const toAddress = body.toAddress.toLowerCase()
    const fromAddress = body.fromAddress.toLowerCase()
    const quantity = body.quantity;

    // Check if wallet can mint:
    // Amount burned 1:1 Genesis and 1:2 OG
    // Amount already held
    // Held + Burned must be less than the requested quantity.
    let genesisBurned = await getNumBurned(toAddress, fromAddress, legacyAddress.toLowerCase());
    let og1Burned = await getNumBurned(toAddress, fromAddress, og1Address.toLowerCase());
    let og2Burned = await getNumBurned(toAddress, fromAddress, og2Address.toLowerCase());
    let numCapsulesHeld = await getNumHeld(capsulesAddress, capsulesAbi, toAddress);
    let allowedCapsules = genesisBurned.numBurns + (og1Burned.numBurns * 2) + (og2Burned.numBurns * 2) - numCapsulesHeld;

    console.log(`${allowedCapsules} allowed, ${quantity} requested`)
    if (quantity > allowedCapsules) {
        res.status(500).json({
            message: `Could not mint: not enough burned tokens to generate ${quantity} capsules.  ${allowedCapsules} allowed`
        });
        return;
    }
    console.log(`Can mint ${quantity}`);

    // mint them
    hashes = [];
    for (let i = 0; i < quantity; i++) {

        const nftJson = await getRandomCapsuleColor();

        const tokenUri = await pinDataToPinata(nftJson);
        if (!tokenUri) {
            continue;
        }

        const tokenResult = await mintToken(toAddress, tokenUri);
        if (!tokenResult) {
            continue;
        }

        let network = ETHER_NETWORK === 'mainnet' ? '' : ETHER_NETWORK;
        let url = `https://${network}.etherscan.io/tx/${tokenResult}`

        hashes.push(url);
    }

    res.status(200).json({
        txHashes: hashes
    })

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
