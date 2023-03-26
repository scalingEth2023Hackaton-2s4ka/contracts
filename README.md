# Getting Started

## Installation

Clone the repo and open the directory:

git clone https://github.com/scalingEth2023Hackaton-2s4ka/contracts.git
cd contracts


Ensure you have [Node](https://nodejs.org/), then install and start the app:

`npm install`

### Run tests
`npx hardhat test`

### Deploy

Create a .env file with your private key and an RPC url

```dotenv
API_URL=
PRIVATE_KEY=
```

Add your network in `hardhat.config.ts` or use sepolia.

Deploy contracts:

`npx hardhat run scripts/deploy.ts --network sepolia`


## Links
* [dApp](https://github.com/scalingEth2023Hackaton-2s4ka/dApp)
* [Video demo](https://drive.google.com/file/d/1xR_RCsY2nGsUB-nOka3qir7naUhTqeJ_/view?usp=share_link)
* [Full video demo](https://drive.google.com/file/d/1xR_RCsY2nGsUB-nOka3qir7naUhTqeJ_/view?usp=share_link)
