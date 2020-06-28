import React, { Component } from 'react';
import getWeb3 from "./getWeb3";
import CallOptionContract from './contracts/CallOption.json';
import CoinbasePro from 'coinbase-pro';

import Navbar from './components/Navbar';
import NewOrder from './components/NewOrder';
import OpenOrder from './components/OpenOrders';
import MarketValue from './components/MarketValue';
import Graph from './components/graph';
import Wallet from './components/Wallet';
import YourOrder from './components/YourOrders';
import { Spinner } from 'react-bootstrap';

const publicClient = new CoinbasePro.PublicClient();

class Dashboard extends Component {

    state = {
        web3: null,
        accounts: null,
        contract: null,
        address: null,
        networkId: 4,
        loading: false
    }

    componentDidMount = async () => {
        try {
            this.setState({ loading: true })
            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const networkId = await web3.eth.net.getId();

            const address = CallOptionContract.networks[networkId].address;

            const instance = new web3.eth.Contract(
                CallOptionContract.abi,
                address,
            );

            this.setState({ loading: false, networkId, web3, accounts, address, contract: instance });
        } catch (error) {
            alert(
                `Please connect to Rinkeby network.`,
            );
            this.setState({ loading: false })
            console.error(error);
        }
    };

    render() {
        if (!this.state.loading && (this.state.web3 == null || this.state.networkId != 4)) {
            return (
                <div className="mt-5 text-center container">
                    <h1 className="text-white">Please connect your Metamask wallet, and switch over to Rinkeby network.</h1>
                    <img src={require('./images/demo.gif')} />
                </div>
            )
        }
        else if(this.state.loading){
            return(
            <div className="loader container text-white text-center">
                <Spinner
                size="lg"
                animation="border"/>
                <span>Waiting for Metamask <img width="36" src={require('./images/meta.png')}/></span>
            </div>)
        }
        return (
            <React.Fragment>
                <div className="custom-row-main">
                    <Navbar accounts={this.state.accounts} />
                    <MarketValue web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                    <NewOrder web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                    <Graph web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                    <OpenOrder web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                    <Wallet web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                    <YourOrder web3={this.state.web3} accounts={this.state.accounts} networkId={this.state.networkId} />
                </div>
            </React.Fragment >
        );
    }
}


export default Dashboard;