import React, { Component } from 'react';
import DaiABI from '../abi/daiCoin.json';

class Wallet extends Component {
  state = {
    eth: 15,
    dai: 1000,
    contract: null,
  };

  componentDidMount = async () => {
    const web3 = this.props.web3;
    const accounts = this.props.accounts;

    const instance = new web3.eth.Contract(
      DaiABI.abi,
      '0x8ad3aa5d5ff084307d28c8f514d7a193b2bfe725'
    );

    this.setState({ web3, accounts, contract: instance }, () => {
      this.updateWallet();
      setInterval(this.updateWallet, 5000);
    });
  };

  updateWallet = async () => {
    let eth = await this.state.web3.eth.getBalance(this.state.accounts[0]);
    eth = this.state.web3.utils.fromWei(eth);
    eth = parseFloat(eth).toFixed(4);

    let dai = await this.state.contract.methods
      .balanceOf(this.state.accounts[0])
      .call();
    dai = this.state.web3.utils.fromWei(dai);
    dai = parseFloat(dai).toFixed(2);

    this.setState({ eth, dai });
  };

  render() {
    return (
      <div className='sec-bg wallet text-white'>
        <div class='input-box-header text-center'>
          <img
            className='ml-2 mb-1'
            src={require('../images/meta.png')}
            width='24'
          />{' '}
          Wallet
        </div>
        <table className='w-100'>
          <tbody>
            <tr>
              <td className='text-center'>
                <img src={require('../images/eth.png')} width='36' />
              </td>
              <td>{this.state.eth}</td>
              <td className='text-center'>
                <img src={require('../images/dai.png')} width='36' />
              </td>
              <td>{this.state.dai}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default Wallet;
