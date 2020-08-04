/* global BigInt */
import React, { Component } from 'react';
import moment from 'moment';
import { Spinner, Modal, Button } from 'react-bootstrap';

import CallOptionContract from '../contracts/CallOption.json';
import PutOptionContract from '../contracts/PutOption.json';
import DaiCoinABI from '../abi/daiCoin.json';
import UsingPriceFeed from '../contracts/UsingPriceFeed.json';

moment().format();
class OpenOrders extends Component {
  state = {
    openCallOrders: [],
    openPutOrders: [],
    web3: null,
    accounts: null,
    callContract: null,
    daiContract: null,
    putContract: null,
    selected: 'call',
    loading: false,
    bcModal: false,
    bpModal: false,
    scModal: false,
    spModal: false,
    order: {},
    buttonText: '',
    buttonLoad: false,
  };

  componentDidMount = async () => {
    const web3 = this.props.web3;
    const accounts = this.props.accounts;

    const networkId = this.props.networkId;

    const priceFeedAddress = UsingPriceFeed.networks[networkId].address;
    const callAddress = CallOptionContract.networks[networkId].address;
    const putAddress = PutOptionContract.networks[networkId].address;

    const callContract = new web3.eth.Contract(
      CallOptionContract.abi,
      callAddress
    );
    const putContract = new web3.eth.Contract(
      PutOptionContract.abi,
      putAddress
    );
    const daiContract = new web3.eth.Contract(
      DaiCoinABI.abi,
      '0x8ad3aa5d5ff084307d28c8f514d7a193b2bfe725'
    );
    const priceContract = new web3.eth.Contract(
      UsingPriceFeed.abi,
      priceFeedAddress
    );

    this.setState(
      {
        loading: true,
        web3,
        accounts,
        callContract,
        putContract,
        daiContract,
        priceContract,
      },
      () => {
        if (web3 != null) {
          this.getData();
        }
      }
    );
  };

  getData = async () => {
    await this.getCallData();
    await this.getPutData();
    this.setState({ loading: false });
  };

  getCallData = async () => {
    const size = await this.state.callContract.methods.uniqueId().call();
    const now = parseInt(Date.now() / 1000);
    let allOptions = [];

    for (let i = 1; i <= size; i++) {
      const option = await this.state.callContract.methods.idToOption(i).call();
      allOptions.push(option);
    }
    for (let i = 0; i < allOptions.length; i++) {
      const option = allOptions[i];
      if (
        option.isAvailable &&
        option.expiry > now &&
        option.partyL != this.state.accounts[0] &&
        option.partyS != this.state.accounts[0]
      ) {
        this.setState({
          openCallOrders: [...this.state.openCallOrders, option],
        });
      }
    }
  };

  getPutData = async () => {
    const size = await this.state.putContract.methods.uniqueId().call();
    const now = parseInt(Date.now() / 1000);

    for (let i = 1; i <= size; i++) {
      const option = await this.state.putContract.methods.idToOption(i).call();
      if (
        option.isAvailable &&
        option.expiry > now &&
        option.partyL != this.state.accounts[0] &&
        option.partyS != this.state.accounts[0]
      ) {
        this.setState({ openPutOrders: [...this.state.openPutOrders, option] });
      }
    }
  };

  handleSelected = (e) => {
    e.preventDefault();

    this.setState({ selected: e.target.value });
  };

  handleConfirmation = async (option, sig) => {
    const sp = this.state.web3.utils.fromWei(option.strikePrice);
    const cost = this.state.web3.utils.fromWei(option.cost);
    const qty = this.state.web3.utils.fromWei(option.quantity);
    const type = option.settlementType;
    const id = option.id;

    //Buy Call
    if (sig == 'CB') {
      let order = { sp, cost, qty, type, id };
      this.setState({
        order,
        buttonText: 'Approve & Buy to Open',
        bcModal: true,
      });
    } else if (sig == 'CS') {
      let mv = await this.state.priceContract.methods.getMarketValue().call();
      mv = this.state.web3.utils.fromWei(mv);
      mv *= qty;
      let order = { sp, cost, qty, type, id, mv };
      this.setState({
        order,
        buttonText: 'Approve & Sell to Open',
        scModal: true,
      });
    } else if (sig == 'PB') {
      let order = { sp, cost, qty, type, id };
      this.setState({
        order,
        buttonText: 'Approve & Buy to Open',
        bpModal: true,
      });
    } else {
      let order = { sp, cost, qty, type, id };
      this.setState({
        order,
        buttonText: 'Approve & Sell to Open',
        spModal: true,
      });
    }
  };

  //Buy: Call
  buyCall = async () => {
    try {
      const cost = this.state.web3.utils.toWei(this.state.order.cost);
      this.setState({ buttonLoad: true, buttonText: 'Waiting for Approval..' });
      //Approve
      await this.state.daiContract.methods
        .approve(this.state.callContract.options.address, cost)
        .send({
          from: this.state.accounts[0],
        });

      //Buy to Open
      this.setState({ buttonText: 'Confirming Transaction..' });
      await this.state.callContract.methods
        .buyToOpen(this.state.order.id)
        .send({
          from: this.state.accounts[0],
        });

      //Reload
      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false, bcModal: false });
  };

  //Sell: Call
  sellCall = async () => {
    try {
      if (this.state.order.type == '0') {
        const qty = this.state.web3.utils.toWei(this.state.order.qty);

        //Sell to Open
        this.setState({
          buttonLoad: true,
          buttonText: 'Confirming Transaction..',
        });
        await this.state.callContract.methods
          .sellToOpen(this.state.order.id, 0, 0)
          .send({
            from: this.state.accounts[0],
            value: qty,
          });
      } else {
        let margin = this.state.order.mv;
        margin = 0.67 * margin;
        margin = this.state.web3.utils.toWei(margin.toString());

        this.setState({
          buttonLoad: true,
          buttonText: 'Waiting for Approval..',
        });
        //Approve
        await this.state.daiContract.methods
          .approve(this.state.callContract.options.address, margin)
          .send({
            from: this.state.accounts[0],
          });

        //Sell to Open
        this.setState({ buttonText: 'Confirming Transaction..' });
        await this.state.callContract.methods
          .sellToOpen(this.state.order.id, 1, margin)
          .send({
            from: this.state.accounts[0],
          });
      }

      //Reload
      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false, bcModal: false });
  };

  //Buy: Put
  buyPut = async () => {
    try {
      const cost = this.state.web3.utils.toWei(this.state.order.cost);
      this.setState({ buttonLoad: true, buttonText: 'Waiting for Approval..' });
      //Approve
      await this.state.daiContract.methods
        .approve(this.state.putContract.options.address, cost)
        .send({
          from: this.state.accounts[0],
        });

      //Buy to Open
      this.setState({ buttonText: 'Confirming Transaction..' });
      await this.state.putContract.methods
        .buyToOpen(this.state.order.id, this.state.order.type)
        .send({
          from: this.state.accounts[0],
        });

      //Reload
      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false, bpModal: false });
  };

  //Sell: Put
  sellPut = async () => {
    try {
      const sp = this.state.web3.utils.toWei(this.state.order.sp);
      this.setState({ buttonLoad: true, buttonText: 'Waiting for Approval..' });
      //Approve
      await this.state.daiContract.methods
        .approve(this.state.putContract.options.address, sp)
        .send({
          from: this.state.accounts[0],
        });

      //Sell to Open
      this.setState({ buttonText: 'Confirming Transaction..' });
      await this.state.putContract.methods
        .sellToOpen(this.state.order.id, sp)
        .send({
          from: this.state.accounts[0],
        });

      //Reload
      window.location.reload();
    } catch (err) {
      alert(err);
    }
  };

  getCallRows = () => {
    return this.state.openCallOrders.map((option, index) => {
      //Expiry Format
      const expiry = moment(option.expiry * 1000);
      const now = moment();
      const days = expiry.diff(now, 'days');
      const hours = expiry.diff(now, 'hours');
      const minutes = expiry.diff(now, 'minutes');
      let expiryString;
      if (days > 0) {
        expiryString = days + ' Day ' + (hours - days * 24) + ' Hrs';
      } else {
        expiryString = hours + ' Hrs ' + (minutes - hours * 60) + ' Mins';
      }

      //Buy/Sell
      let isBuy;
      let action;
      if (BigInt(option.partyL) == 0) {
        action = 'Buy';
        isBuy = true;
      } else {
        action = 'Sell';
        isBuy = false;
      }

      //Settlement Type
      let type;
      if (BigInt(option.partyL) == 0) {
        if (option.settlementType == 0) type = 'ETH';
        else type = 'DAI';
      } else {
        type = 'N/A';
      }

      return (
        <tr key={index} className='fade-in order-row'>
          <td>{expiryString}</td>
          <td>{this.state.web3.utils.fromWei(option.strikePrice)}</td>
          <td>{this.state.web3.utils.fromWei(option.cost)}</td>
          <td>{this.state.web3.utils.fromWei(option.quantity)}</td>
          <td className={type == 'N/A' ? 'text-dark' : ''}>{type}</td>
          {isBuy && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'CB');
              }}
              className='text-success'
            >
              {action}
            </td>
          )}
          {!isBuy && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'CS');
              }}
              className='text-danger'
            >
              {action}
            </td>
          )}
        </tr>
      );
    });
  };

  getPutRows = () => {
    return this.state.openPutOrders.map((option, index) => {
      //Expiry Format
      const expiry = moment(option.expiry * 1000);
      const now = moment();
      const days = expiry.diff(now, 'days');
      const hours = expiry.diff(now, 'hours');
      const minutes = expiry.diff(now, 'minutes');
      let expiryString;
      if (days > 0) {
        expiryString = days + ' Day ' + (hours - days * 24) + ' Hrs';
      } else {
        expiryString = hours + ' Hrs ' + (minutes - hours * 60) + ' Mins';
      }

      //Buy/Sell
      let isBuy;
      let action;
      if (BigInt(option.partyL) == 0) {
        action = 'Buy';
        isBuy = true;
      } else {
        action = 'Sell';
        isBuy = false;
      }

      //Settlement Type
      let type;
      if (BigInt(option.partyS) == 0) {
        if (option.settlementType == 0) type = 'ETH';
        else type = 'DAI';
      } else {
        type = 'N/A';
      }

      return (
        <tr key={index} className='fade-in order-row'>
          <td>{expiryString}</td>
          <td>{this.state.web3.utils.fromWei(option.strikePrice)}</td>
          <td>{this.state.web3.utils.fromWei(option.cost)}</td>
          <td>{this.state.web3.utils.fromWei(option.quantity)}</td>
          <td className={type == 'N/A' ? 'text-dark' : ''}>{type}</td>
          {isBuy && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'PB');
              }}
              className='text-success'
            >
              {action}
            </td>
          )}
          {!isBuy && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'PS');
              }}
              className='text-danger'
            >
              {action}
            </td>
          )}
        </tr>
      );
    });
  };

  render() {
    return (
      <div className='sec-bg open-orders'>
        <div className='mb-2 input-box-header'>
          <span className='ml-3'>Open Orders</span>
          <select
            onChange={this.handleSelected}
            style={{ background: '#242424' }}
            className='mr-3 float-right option-select-top'
          >
            <option value='call' selected>
              Call
            </option>
            <option value='put'>Put</option>
          </select>
        </div>
        <div className='orders-bar text-center'>
          <table>
            <thead>
              <tr class='text-secondary open-header'>
                <th>Expiry</th>
                <th>Strike Price</th>
                <th>Option Cost</th>
                <th>Quantity</th>
                <th>Settlement Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {this.state.selected == 'call' &&
                this.state.openCallOrders.length > 0 &&
                this.getCallRows()}
              {this.state.selected == 'put' &&
                this.state.openPutOrders.length > 0 &&
                this.getPutRows()}
            </tbody>
          </table>
          {this.state.loading && (
            <Spinner size='sm' animation='border' variant='light' />
          )}
        </div>
        {!this.state.loading &&
          this.state.selected == 'put' &&
          this.state.openPutOrders.length == 0 && (
            <p className='mt-5 text-secondary text-center'>
              No open orders for put options available right now.
            </p>
          )}
        {!this.state.loading &&
          this.state.selected == 'call' &&
          this.state.openCallOrders.length == 0 && (
            <p className='mt-5 text-secondary text-center'>
              No open orders for call options available right now.
            </p>
          )}

        {/* Buy Call Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.bcModal}
          onHide={() => {
            this.setState({ bcModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Transaction Approval Request</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <thead>
                <tr>
                  <th className='text-center' colSpan={2}>
                    Options Details
                  </th>
                </tr>
              </thead>
              <tbody className='transaction-table'>
                <tr>
                  <td>Option Type: </td>
                  <td>Call</td>
                </tr>
                <tr>
                  <td>Strike Price: </td>
                  <td>{this.state.order.sp}</td>
                </tr>
                <tr>
                  <td>Cost/Premium: </td>
                  <td>{this.state.order.cost}</td>
                </tr>
                <tr>
                  <td>Quantity: </td>
                  <td>{this.state.order.qty}</td>
                </tr>
                <tr>
                  <td>Settlement Type: </td>
                  <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                </tr>
                <tr>
                  <td className='text-white' colSpan={2}>
                    Please approve the options contract to retrieve{' '}
                    <img
                      src={require('../images/dai.png')}
                      width='12'
                      className='mx-1'
                    />{' '}
                    {this.state.order.cost} DAI from your account, to be paid as
                    premium to the seller.
                  </td>
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white red-bg'
              disabled={this.state.buttonLoad}
              variant=''
              onClick={() => this.setState({ bcModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white green-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.buyCall}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Sell Call Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.scModal}
          onHide={() => {
            this.setState({ scModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Transaction Approval Request</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <thead>
                <tr>
                  <th className='text-center' colSpan={2}>
                    Options Details
                  </th>
                </tr>
              </thead>
              <tbody className='transaction-table'>
                <tr>
                  <td>Option Type: </td>
                  <td>Call</td>
                </tr>
                <tr>
                  <td>Strike Price: </td>
                  <td>{this.state.order.sp}</td>
                </tr>
                <tr>
                  <td>Cost/Premium: </td>
                  <td>{this.state.order.cost}</td>
                </tr>
                <tr>
                  <td>Quantity: </td>
                  <td>{this.state.order.qty}</td>
                </tr>
                <tr>
                  <td>Select Settlement Type: </td>
                  <td>
                    <select
                      defaultValue={'0'}
                      onClick={(e) => {
                        e.preventDefault();
                        let order = this.state.order;
                        order.type = e.target.value;
                        this.setState({ order });
                      }}
                      className='option-select-top'
                    >
                      <option value='0' selected>
                        ETH
                      </option>
                      <option value='1'>DAI</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  {this.state.order.type == '0' && (
                    <td className='text-white' colSpan={2}>
                      Please send the options contract{' '}
                      <img
                        src={require('../images/eth.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.qty} ETH from your account, to be sold
                      to the buyer, on settlement.
                    </td>
                  )}
                  {this.state.order.type == '1' && (
                    <td className='text-white' colSpan={2}>
                      Please approve the options contract to retrieve{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(0.67 * this.state.order.mv).toFixed(2)} DAI from your
                      account, as margin.
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              disabled={this.state.buttonLoad}
              className='text-white red-bg'
              variant=''
              onClick={() => this.setState({ scModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white green-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.sellCall}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Buy Put Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.bpModal}
          onHide={() => {
            this.setState({ bpModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Transaction Approval Request</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <thead>
                <tr>
                  <th className='text-center' colSpan={2}>
                    Options Details
                  </th>
                </tr>
              </thead>
              <tbody className='transaction-table'>
                <tr>
                  <td>Option Type: </td>
                  <td>Put</td>
                </tr>
                <tr>
                  <td>Strike Price: </td>
                  <td>{this.state.order.sp}</td>
                </tr>
                <tr>
                  <td>Cost/Premium: </td>
                  <td>{this.state.order.cost}</td>
                </tr>
                <tr>
                  <td>Quantity: </td>
                  <td>{this.state.order.qty}</td>
                </tr>
                <tr>
                  <td>Select Settlement Type: </td>
                  <td>
                    <select
                      defaultValue={'0'}
                      onClick={(e) => {
                        e.preventDefault();
                        let order = this.state.order;
                        order.type = e.target.value;
                        this.setState({ order });
                      }}
                      className='option-select-top'
                    >
                      <option value='0' selected>
                        ETH
                      </option>
                      <option value='1'>DAI</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className='text-white' colSpan={2}>
                    Please approve the options contract to retrieve{' '}
                    <img
                      src={require('../images/dai.png')}
                      width='12'
                      className='mx-1'
                    />{' '}
                    {this.state.order.cost} DAI from your account, to be paid to
                    the seller.
                  </td>
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              disabled={this.state.buttonLoad}
              className='text-white red-bg'
              variant=''
              onClick={() => this.setState({ bpModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white green-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.buyPut}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Sell Put Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.spModal}
          onHide={() => {
            this.setState({ bcModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Transaction Approval Request</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <thead>
                <tr>
                  <th className='text-center' colSpan={2}>
                    Options Details
                  </th>
                </tr>
              </thead>
              <tbody className='transaction-table'>
                <tr>
                  <td>Option Type: </td>
                  <td>Call</td>
                </tr>
                <tr>
                  <td>Strike Price: </td>
                  <td>{this.state.order.sp}</td>
                </tr>
                <tr>
                  <td>Cost/Premium: </td>
                  <td>{this.state.order.cost}</td>
                </tr>
                <tr>
                  <td>Quantity: </td>
                  <td>{this.state.order.qty}</td>
                </tr>
                <tr>
                  <td>Settlement Type: </td>
                  <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                </tr>
                <tr>
                  <td className='text-white' colSpan={2}>
                    Please approve the options contract to retrieve{' '}
                    <img
                      src={require('../images/dai.png')}
                      width='12'
                      className='mx-1'
                    />{' '}
                    {this.state.order.sp} DAI from your account, as margin.
                  </td>
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white red-bg'
              disabled={this.state.buttonLoad}
              variant=''
              onClick={() => this.setState({ spModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white green-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.sellPut}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

export default OpenOrders;
