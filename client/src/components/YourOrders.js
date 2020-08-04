/* global BigInt */
import React, { Component } from 'react';
import moment from 'moment';
import { Spinner, Modal, Button } from 'react-bootstrap';

import CallOptionContract from '../contracts/CallOption.json';
import PutOptionContract from '../contracts/PutOption.json';
import DaiCoinABI from '../abi/daiCoin.json';
import UsingPriceFeed from '../contracts/UsingPriceFeed.json';

moment().format();
class YourOrders extends Component {
  state = {
    web3: null,
    accounts: null,
    contract: null,
    callOrders: [],
    putOrders: [],
    ccModal: false,
    rcModal: false,
    selected: 'call',
    buttonText: '',
    order: {},
    loading: false,
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
      { web3, accounts, callContract, putContract, daiContract, priceContract },
      () => {
        if (web3 != null) {
          this.getData();
        }
      }
    );
  };

  getData = async () => {
    this.setState({ loading: true });
    //Get Market Value
    let mv = await this.state.priceContract.methods.getMarketValue().call();
    mv = this.state.web3.utils.fromWei(mv);
    this.setState({ mv });

    await this.getCallData();
    await this.getPutData();

    this.setState({ loading: false });
  };

  //Refund Expired Call
  refundExpiredCall = async (id) => {
    try {
      this.setState({ buttonLoad: true, buttonText: 'Refunding..' });

      await this.state.callContract.methods
        .refundExpired(this.state.order.id)
        .send({
          from: this.state.accounts[0],
        });

      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  //Close unwanted call option
  closeCall = async () => {
    try {
      this.setState({ buttonLoad: true, buttonText: 'Closing Option..' });

      await this.state.callContract.methods
        .closeOption(this.state.order.id)
        .send({
          from: this.state.accounts[0],
        });

      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  //Settle call option
  settleCall = async () => {
    try {
      this.setState({ buttonLoad: true });
      if (this.state.order.type == '0') {
        this.setState({ buttonText: 'Waiting for Approval..' });
        //Approve
        const strikeprice = this.state.web3.utils.toWei(this.state.order.sp);
        await this.state.daiContract.methods
          .approve(this.state.callContract.options.address, strikeprice)
          .send({
            from: this.state.accounts[0],
          });

        this.setState({ buttonText: 'Confirming Settlement..' });

        //Settle
        await this.state.callContract.methods
          .settleOption(this.state.order.id)
          .send({
            from: this.state.accounts[0],
          });

        window.location.reload();
      } else {
        this.setState({ buttonText: 'Confirming Settlement..' });

        //Settle
        await this.state.callContract.methods
          .settleOption(this.state.order.id)
          .send({
            from: this.state.accounts[0],
          });

        window.location.reload();
      }
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  //Close unwanted put option
  closePut = async () => {
    try {
      this.setState({ buttonLoad: true, buttonText: 'Closing Option..' });

      await this.state.putContract.methods
        .closeOption(this.state.order.id)
        .send({
          from: this.state.accounts[0],
        });

      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  //Refund Expired put
  refundExpiredPut = async () => {
    try {
      this.setState({ buttonLoad: true, buttonText: 'Refunding..' });

      await this.state.putContract.methods
        .refundExpired(this.state.order.id)
        .send({
          from: this.state.accounts[0],
        });

      window.location.reload();
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  //Settle Put
  settlePut = async () => {
    try {
      this.setState({ buttonLoad: true });
      if (this.state.order.type == '0') {
        this.setState({ buttonText: 'Confirming Settlement..' });

        //Settle
        await this.state.putContract.methods
          .settleOption(this.state.order.id)
          .send({
            from: this.state.accounts[0],
            value: this.state.web3.utils.toWei(this.state.order.qty),
          });

        window.location.reload();
      } else {
        this.setState({ buttonText: 'Confirming Settlement..' });

        //Settle
        await this.state.putContract.methods
          .settleOption(this.state.order.id)
          .send({
            from: this.state.accounts[0],
          });

        window.location.reload();
      }
    } catch (err) {
      alert(err);
    }

    this.setState({ buttonLoad: false });
  };

  handleConfirmation = async (option, sig, pos) => {
    const sp = this.state.web3.utils.fromWei(option.strikePrice);
    const cost = this.state.web3.utils.fromWei(option.cost);
    const qty = this.state.web3.utils.fromWei(option.quantity);
    const mv = this.state.mv * qty;
    const margin = this.state.web3.utils.fromWei(option.initialSellerMargin);
    const type = option.settlementType;
    const id = option.id;

    let lossy;
    if (mv < sp) {
      lossy = true;
    } else {
      lossy = false;
    }

    const order = { sp, cost, qty, type, id, pos, margin, mv, lossy };

    if (sig == 'CC') {
      this.setState({ order, buttonText: 'Close and Refund', ccModal: true });
    } else if (sig == 'RC') {
      this.setState({ order, buttonText: 'Confirm Refund', rcModal: true });
    } else if (sig == 'SC') {
      this.setState({ order, buttonText: 'Confirm Settlement', scModal: true });
    } else if (sig == 'CP') {
      this.setState({ order, buttonText: 'Close and Refund', cpModal: true });
    } else if (sig == 'RP') {
      this.setState({ order, buttonText: 'Confirm Refund', rpModal: true });
    } else if (sig == 'SP') {
      this.setState({ order, buttonText: 'Confirm Settlement', spModal: true });
    }
  };

  getPutData = async () => {
    //Number of options
    const numOptions = await this.state.putContract.methods
      .getOptionsCount(this.state.accounts[0])
      .call();

    for (let i = numOptions - 1; i >= 0; i--) {
      //Get id
      const id = await this.state.putContract.methods
        .addressToOptions(this.state.accounts[0], i)
        .call();
      //Get option
      const option = await this.state.putContract.methods.idToOption(id).call();
      //Put option into state
      if (!option.settled)
        this.setState({ putOrders: [...this.state.putOrders, option] });
    }
  };

  getCallData = async () => {
    //Number of options
    const numOptions = await this.state.callContract.methods
      .getOptionsCount(this.state.accounts[0])
      .call();

    for (let i = numOptions - 1; i >= 0; i--) {
      //Get id
      const id = await this.state.callContract.methods
        .addressToOptions(this.state.accounts[0], i)
        .call();
      //Get option
      const option = await this.state.callContract.methods
        .idToOption(id)
        .call();
      //Put option into state
      if (!option.settled)
        this.setState({ callOrders: [...this.state.callOrders, option] });
    }
  };

  getCallRows = () => {
    return this.state.callOrders.map((option, index) => {
      //Get Market Value
      const mv = this.state.mv;

      const qty = this.state.web3.utils.fromWei(option.quantity);
      const sp = this.state.web3.utils.fromWei(option.strikePrice);
      const cost = this.state.web3.utils.fromWei(option.cost);
      const marketValue = mv * qty;

      //Expiry
      let expiryString;
      if (Date.now() / 1000 > option.expiry) {
        expiryString = 'Expired';
      } else {
        const expiry = moment(option.expiry * 1000);
        const now = moment();
        const days = expiry.diff(now, 'days');
        const hours = expiry.diff(now, 'hours');
        const minutes = expiry.diff(now, 'minutes');
        if (days > 0) {
          expiryString = days + ' Day ' + (hours - days * 24) + ' Hrs';
        } else {
          expiryString = hours + ' Hrs ' + (minutes - hours * 60) + ' Mins';
        }
      }

      //Position
      let position;
      if (option.partyS == this.state.accounts[0]) {
        position = 'Short';
      } else if (option.partyL == this.state.accounts[0]) {
        position = 'Long';
      }

      //Profit/Loss
      let PL = 0;
      if (expiryString != 'Expired' && !option.isAvailable) {
        if (position == 'Long') {
          PL = marketValue - sp - cost;
        } else {
          PL = Math.min(cost, cost - (marketValue - sp));
        }
      }

      return (
        <tr key={index} className='fade-in order-row'>
          <td
            style={{ fontSize: '12px' }}
            className={expiryString == 'Expired' ? 'light-white' : ''}
          >
            {expiryString}
          </td>
          <td>{position}</td>
          <td
            className={
              (PL > 0 && 'text-success') ||
              (PL < 0 && 'text-danger') ||
              (PL == 0 && 'text-dark')
            }
          >
            {PL != 0 ? PL.toFixed(1) : 'N/A'}
          </td>
          {!option.isAvailable &&
            !option.settled &&
            expiryString == 'Expired' &&
            position == 'Short' && (
              <td
                onClick={() => {
                  this.handleConfirmation(option, 'RC', position);
                }}
                className='text-warning'
              >
                Refund
              </td>
            )}
          {!option.isAvailable &&
            expiryString == 'Expired' &&
            position == 'Long' && <td className='text-dark'>-</td>}
          {option.isAvailable && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'CC', position);
              }}
              className='text-warning'
            >
              Refund
            </td>
          )}
          {!option.isAvailable &&
            !option.settled &&
            expiryString != 'Expired' &&
            position == 'Long' && (
              <td
                onClick={() => {
                  this.handleConfirmation(option, 'SC', position);
                }}
                className='text-primary'
              >
                Settle
              </td>
            )}
          {!option.isAvailable &&
            !option.settled &&
            expiryString != 'Expired' &&
            position == 'Short' && <td className='text-dark'>N/A</td>}
        </tr>
      );
    });
  };

  getPutRows = () => {
    return this.state.putOrders.map((option, index) => {
      //Get Market Value
      const mv = this.state.mv;

      const qty = this.state.web3.utils.fromWei(option.quantity);
      const sp = this.state.web3.utils.fromWei(option.strikePrice);
      const cost = this.state.web3.utils.fromWei(option.cost);
      const marketValue = mv * qty;

      //Expiry
      let expiryString;
      if (Date.now() / 1000 > option.expiry) {
        expiryString = 'Expired';
      } else {
        const expiry = moment(option.expiry * 1000);
        const now = moment();
        const days = expiry.diff(now, 'days');
        const hours = expiry.diff(now, 'hours');
        const minutes = expiry.diff(now, 'minutes');
        if (days > 0) {
          expiryString = days + ' Day ' + (hours - days * 24) + ' Hrs';
        } else {
          expiryString = hours + ' Hrs ' + (minutes - hours * 60) + ' Mins';
        }
      }

      //Position
      let position;
      if (option.partyS == this.state.accounts[0]) {
        position = 'Short';
      } else if (option.partyL == this.state.accounts[0]) {
        position = 'Long';
      }

      //Profit/Loss
      let PL = 0;
      if (expiryString != 'Expired' && !option.isAvailable) {
        if (position == 'Long') {
          PL = sp - marketValue - cost;
        } else {
          PL = Math.min(cost, cost - (sp - marketValue));
        }
      }

      return (
        <tr key={index} className='fade-in order-row'>
          <td
            style={{ fontSize: '12px' }}
            className={expiryString == 'Expired' ? 'light-white' : ''}
          >
            {expiryString}
          </td>
          <td>{position}</td>
          <td
            className={
              (PL > 0 && 'text-success') ||
              (PL < 0 && 'text-danger') ||
              (PL == 0 && 'text-dark')
            }
          >
            {PL != 0 ? PL.toFixed(1) : 'N/A'}
          </td>
          {!option.isAvailable &&
            !option.settled &&
            expiryString == 'Expired' &&
            position == 'Short' && (
              <td
                onClick={() => {
                  this.handleConfirmation(option, 'RP', position);
                }}
                className='text-warning'
              >
                Refund
              </td>
            )}
          {!option.isAvailable &&
            expiryString == 'Expired' &&
            position == 'Long' && <td className='text-dark'>-</td>}
          {option.isAvailable && (
            <td
              onClick={() => {
                this.handleConfirmation(option, 'CP', position);
              }}
              className='text-warning'
            >
              Refund
            </td>
          )}
          {!option.isAvailable &&
            !option.settled &&
            expiryString != 'Expired' &&
            position == 'Long' && (
              <td
                onClick={() => {
                  this.handleConfirmation(option, 'SP', position);
                }}
                className='text-primary'
              >
                Settle
              </td>
            )}
          {!option.isAvailable &&
            !option.settled &&
            expiryString != 'Expired' &&
            position == 'Short' && <td className='text-dark'>N/A</td>}
        </tr>
      );
    });
  };

  render() {
    return (
      <div className='your-orders sec-bg'>
        <div className='mb-2 input-box-header'>
          <span className='ml-3'>Your Orders</span>
          <select
            onChange={(e) => {
              this.setState({ selected: e.target.value });
            }}
            style={{ background: '#242424' }}
            className='mr-3 float-right option-select-top'
          >
            <option value='call' selected>
              Call
            </option>
            <option value='put'>Put</option>
          </select>
        </div>
        <div className='y-orders-bar text-center'>
          <table>
            <thead>
              <tr class='text-secondary open-header'>
                <th>Expiry</th>
                <th>Position</th>
                <th>P/L</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {this.state.selected == 'call' &&
                this.state.callOrders.length > 0 &&
                this.getCallRows()}
              {this.state.selected == 'put' &&
                this.state.putOrders.length > 0 &&
                this.getPutRows()}
            </tbody>
          </table>
          {this.state.loading && (
            <Spinner size='sm' animation='border' variant='light' />
          )}
        </div>

        {!this.state.loading &&
          this.state.selected == 'put' &&
          this.state.putOrders.length == 0 && (
            <p className='mt-5 text-secondary text-center'>
              No orders for put options available right now.
            </p>
          )}
        {!this.state.loading &&
          this.state.selected == 'call' &&
          this.state.callOrders.length == 0 && (
            <p className='mt-5 text-secondary text-center'>
              No orders for call options available right now.
            </p>
          )}

        {/* Call Close Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.ccModal}
          onHide={() => {
            this.setState({ ccModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Order Close Confirmation</Modal.Title>
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
                {this.state.order.pos == 'Short' && (
                  <tr>
                    <td>Settlement Type: </td>
                    <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                  </tr>
                )}
                <tr>
                  {this.state.order.pos == 'Long' && (
                    <td className='text-white' colSpan={2}>
                      On closing,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.cost} DAI would be refunded into your
                      account.
                    </td>
                  )}
                  {this.state.order.pos == 'Short' &&
                    this.state.order.type == '1' && (
                      <td className='text-white' colSpan={2}>
                        On closing,{' '}
                        <img
                          src={require('../images/dai.png')}
                          width='12'
                          className='mx-1'
                        />{' '}
                        {(this.state.order.margin * 1).toFixed(2)} DAI would be
                        refunded into your account.
                      </td>
                    )}
                  {this.state.order.pos == 'Short' &&
                    this.state.order.type == '0' && (
                      <td className='text-white' colSpan={2}>
                        On closing,{' '}
                        <img
                          src={require('../images/eth.png')}
                          width='12'
                          className='mx-1'
                        />{' '}
                        {this.state.order.qty} ETH would be refunded into your
                        account.
                      </td>
                    )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ ccModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white red-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.closeCall}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Refund Expired Call Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.rcModal}
          onHide={() => {
            this.setState({ rcModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Refund Confirmation</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <tbody>
                <tr>
                  {this.state.order.type == '0' && (
                    <td className='text-white' colSpan={2}>
                      {' '}
                      <img
                        src={require('../images/eth.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(this.state.order.qty * 1).toFixed(2)} ETH would be
                      refunded into your account.
                    </td>
                  )}
                  {this.state.order.type == '1' && (
                    <td className='text-white' colSpan={2}>
                      {' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(this.state.order.margin * 1).toFixed(2)} DAI would be
                      refunded into your account.
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ rcModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white red-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.refundExpiredCall}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Settle Call Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.scModal}
          onHide={() => {
            this.setState({ scModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Option Settle Confirmation</Modal.Title>
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
                {this.state.order.pos == 'Short' && (
                  <tr>
                    <td>Settlement Type: </td>
                    <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                  </tr>
                )}
                <tr>
                  {!this.state.order.lossy && this.state.order.type == '0' && (
                    <td className='text-white' colSpan={2}>
                      On Settling,{' '}
                      <img
                        src={require('../images/eth.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.qty} ETH would be transferred to your
                      account, in exchange of{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.sp} DAI.
                    </td>
                  )}
                  {!this.state.order.lossy && this.state.order.type == '1' && (
                    <td className='text-white' colSpan={2}>
                      On Settling,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(this.state.order.mv - this.state.order.sp).toFixed(2)}{' '}
                      DAI would be transferred to your account.{' '}
                    </td>
                  )}
                  {this.state.order.lossy && (
                    <td className='text-danger'>
                      Settling not allowed. You are incurring a loss!
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ scModal: false })}
            >
              Cancel
            </Button>
            <Button
              className={
                this.state.order.lossy == true
                  ? 'text-white red-bg'
                  : 'text-white green-bg'
              }
              variant=''
              disabled={this.state.buttonLoad || this.state.order.lossy}
              onClick={this.settleCall}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Put Close Modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.cpModal}
          onHide={() => {
            this.setState({ cpModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Order Close Confirmation</Modal.Title>
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
                {this.state.order.pos == 'Long' && (
                  <tr>
                    <td>Settlement Type: </td>
                    <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                  </tr>
                )}
                <tr>
                  {this.state.order.pos == 'Long' && (
                    <td className='text-white' colSpan={2}>
                      On closing,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.cost} DAI would be refunded into your
                      account.
                    </td>
                  )}
                  {this.state.order.pos == 'Short' && (
                    <td className='text-white' colSpan={2}>
                      On closing,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(this.state.order.margin * 1).toFixed(2)} DAI would be
                      refunded into your account.
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ cpModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white red-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.closePut}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Put Refund modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.rpModal}
          onHide={() => {
            this.setState({ rpModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Refund Confirmation</Modal.Title>
          </Modal.Header>
          <Modal.Body className='sec-bg'>
            <table>
              <tbody>
                <tr>
                  <td className='text-white' colSpan={2}>
                    {' '}
                    <img
                      src={require('../images/dai.png')}
                      width='12'
                      className='mx-1'
                    />{' '}
                    {(this.state.order.margin * 1).toFixed(2)} DAI would be
                    refunded into your account.
                  </td>
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ rpModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white red-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.refundExpiredPut}
            >
              {this.state.buttonLoad && (
                <Spinner size='sm' animation='grow' className='mb-1 mr-2' />
              )}
              {this.state.buttonText}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Settle Put modal */}
        <Modal
          backdrop='static'
          className='text-white'
          show={this.state.spModal}
          onHide={() => {
            this.setState({ spModal: false });
          }}
        >
          <Modal.Header className='head-bg' closeButton>
            <Modal.Title>Settlement Confirmation</Modal.Title>
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
                {this.state.order.pos == 'Long' && (
                  <tr>
                    <td>Settlement Type: </td>
                    <td>{this.state.order.type == 0 ? 'ETH' : 'DAI'}</td>
                  </tr>
                )}
                <tr>
                  {this.state.order.type == '0' && (
                    <td className='text-white' colSpan={2}>
                      On closing,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.sp} DAI will be transferred to your
                      account, in exchange of{' '}
                      <img
                        src={require('../images/eth.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {this.state.order.qty} ETH.
                    </td>
                  )}
                  {this.state.order.type == '1' && (
                    <td className='text-white' colSpan={2}>
                      On closing,{' '}
                      <img
                        src={require('../images/dai.png')}
                        width='12'
                        className='mx-1'
                      />{' '}
                      {(this.state.order.sp - this.state.order.mv).toFixed(2)}{' '}
                      DAI would be transferred to your account.
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </Modal.Body>
          <Modal.Footer className='head-bg'>
            <Button
              className='text-white'
              disabled={this.state.buttonLoad}
              variant='secondary'
              onClick={() => this.setState({ spModal: false })}
            >
              Cancel
            </Button>
            <Button
              className='text-white red-bg'
              variant=''
              disabled={this.state.buttonLoad}
              onClick={this.settlePut}
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

export default YourOrders;
