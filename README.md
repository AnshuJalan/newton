# Newton

## Screenshot

![Trading Page](https://i.ibb.co/w7wXMXZ/trading.jpg)

## Description

### Overview

- Newton is a decentralized trading platform for OTC (Over The Counter) Ethereum call & put options. Newton gives the traders the freedom to customize their options and select a strike price, premium and lot size of their choice while placing an order.
- These are American style options with a default (and, as of now fixed) expiry period of 48 hours from the time of creation.
- All orders get listed on the platform's order book (handled by smart contracts) from where potential counterparties could directly take up the LONG/SELL position for an order of their choice.
- The SHORT position is always collaterilzed to hedge risk of defaulting, either with the underlying amount of ETH or by a margin of _2/3rd_ of the market value of the ETH at stake, in DAI.
- Settlements could be done anytime before expiry, either in ETH or DAI stablecoin. Settlement type is expected to be decided by the party who is supposed to be selling the underlying asset (i.e the LONG position holder for a PUT and the SHORT position holder for a CALL).
- All market values needed on the platform to calculate the seller's margin and settlement cash, are received from [Tellor Oracles](https://tellor.io/).
- The platform is [live](https://newton-1.herokuapp.com/) on Rinkeby. To get an insight into how to trade, view this comprehensive [demo](https://www.youtube.com/watch?v=iF4SL0_LibE&t=27s).

### Technical Aspects

- **Front-end:** React, Web3.js
- **Smart Contracts:** Solidity
- **Charts:** [CanvasJS charts](https://canvasjs.com/)
- **Oracle:** [Tellor](https://tellor.io/)
- **Pricing API:** [Coinbase Pro API](https://docs.pro.coinbase.com/)

## Running Locally

_The dapp requires Metamask Wallet_

After cloning the repo, enter the following commands while in the root directory:

1. `npm install` to install all your dependencies

2. `npm run client-install` to install all the client dependencies i.e in React

3. `npm run dapp` to launch the dapp, on localhost:3000

## Scope of Contribution

Contributions and improvment proposals are welcomed! These are some of the possible ideas around which the platform could be extended:

- Tokenization of the options, allowing holders to sell of their positions before expiry.
- A system of making margin calls, possibly similar to the keeper system on MakerDAO. As of now the DAI margin is kept fixed assuming relatively no steep price changes in a span of 48 hours.

## Relevant Links

- **Live on Rinkeby:** https://newton-1.herokuapp.com/
- **Demo on Youtube:** https://www.youtube.com/watch?v=iF4SL0_LibE&t=27s
