import React, { Component } from 'react';
import getWeb3 from "../getWeb3";
import UsingPriceFeed from '../contracts/UsingPriceFeed.json';

class MarketValue extends Component {

    state = {
        web3: null,
        eth: 235.25,
        ethColor: "",
        ethSign: "",
        dai: 1.0025,
        daiSign: "",
        daiColor: "",
        ethdai: 235.14,
        ethdaiSign: "",
        ethDiff: 1.2,
        ethdaiColor: "",
        daiDiff: 0.005,
        ethdaiDiff: 1.3
    }

    componentDidMount = async () => {

        const web3 = this.props.web3;
        const networkId = this.props.networkId;

        const address = UsingPriceFeed.networks[networkId].address;

        const instance = new web3.eth.Contract(
            UsingPriceFeed.abi,
            address,
        );

        this.setState({ web3, contract: instance }, () => {
            this.updateData();
            setInterval(this.updateData, 30000);
        });
    }

    updateData = async () => {
        const ethList = await this.state.contract.methods.getEthRange().call();
        let eth = (ethList[1] / 1000000)
        let ethDiff = ((ethList[1] - ethList[0]) / 1000000).toFixed(1);

        let ethSign;
        let ethColor;

        if (ethDiff >= 0) {
            ethSign = "fa fa-caret-up"
            ethColor = "text-success"
        } else {
            ethSign = "fa fa-caret-down"
            ethColor = "text-danger"
        }

        ethDiff = Math.abs(ethDiff)

        const daiList = await this.state.contract.methods.getDaiRange().call();
        let dai = (daiList[1] / 1000000)
        let daiDiff = ((daiList[1] - daiList[0]) / 1000000).toFixed(6);

        let daiSign;
        let daiColor;

        if (daiDiff >= 0) {
            daiSign = "fa fa-caret-up"
            daiColor = "text-success"
        } else {
            daiSign = "fa fa-caret-down"
            daiColor = "text-danger"
        }

        daiDiff = Math.abs(daiDiff)

        let ethdai = (ethList[1] / daiList[1])
        let ethdaiDiff = (ethdai - (ethList[0] / daiList[0])).toFixed(6);

        let ethdaiSign;
        let ethdaiColor;

        if (ethdaiDiff >= 0) {
            ethdaiSign = "fa fa-caret-up";
            ethdaiColor = "text-success"
        } else {
            ethdaiSign = "fa fa-caret-down"
            ethdaiColor = "text-danger";
        }

        ethdaiDiff = Math.abs(ethdaiDiff);

        eth = eth.toFixed(2)
        dai = dai.toFixed(3)
        ethdai = ethdai.toFixed(2);

        this.setState({ eth, dai, ethDiff, daiDiff, ethdai, daiSign, ethSign, ethdaiSign, ethColor, daiColor, ethdaiColor });
    }

    render() {
        return (
            <div className="sec-bg market-val">
                <table className="text-center text-white" style={{ width: "100%" }}>
                    <tbody>
                        <tr>
                            <td>
                                <img className="mr-2" src={require('../images/eth.png')} width="36" />
                                <span className="font-weight-bold ml-2 text-secondary">ETH/USD</span>
                            </td>
                            <td>
                                <span>$ {this.state.eth}</span>
                                <span className={"ml-2 " + this.state.ethColor}><i className={this.state.ethSign}></i> {this.state.ethDiff}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img className="mr-2" src={require('../images/dai.png')} width="36" />
                                <span className="font-weight-bold ml-2 text-secondary">DAI/USD</span>
                            </td>
                            <td>
                                <span>$ {this.state.dai}</span>
                                <span className={"ml-2 " + this.state.daiColor}><i className={this.state.daiSign}></i> {this.state.daiDiff}</span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <img className="mr-2" src={require('../images/ethdai.png')} width="36" />
                                <span className="font-weight-bold ml-2 text-secondary">ETH/DAI</span>
                            </td>
                            <td>
                                <span>DAI {this.state.ethdai}</span>
                                <span className={"ml-2 " + this.state.ethdaiColor}><i className={this.state.ethdaiSign}></i> {this.state.ethdaiDiff}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default MarketValue;