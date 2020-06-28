import React, { Component } from 'react';
import getWeb3 from "../getWeb3";
import { Modal, Button, Spinner } from 'react-bootstrap';

import CallOptionContract from '../contracts/CallOption.json';
import PutOptionContract from '../contracts/PutOption.json';
import UsingPriceFeed from '../contracts/UsingPriceFeed.json';
import DaiCoinABI from '../abi/daiCoin.json';

class NewOrder extends Component {
  state = {
    web3: null,
    callContract: null,
    putContract: null,
    priceContract: null,
    daiContract: null,
    activeGreen: "green-box col-sm-6",
    activeRed: "col-sm-6",
    buttonColor: "green-bg",
    buttonText: "BUY",
    showType: false,
    selectedOption: "call",
    position: 'long',
    strikeprice: "",
    cost: "",
    type: "0",
    quantity: "",
    mainModalShow: false,
    warnModalShow: false,
    loading: false
  }

  constructor(props) {
    super(props);

    this.form = React.createRef();
  }

  componentDidMount = async () => {
    const web3 = this.props.web3;
    const accounts = this.props.accounts;

    const networkId = this.props.networkId;

    const callAddress = CallOptionContract.networks[networkId].address;
    const putAddress = PutOptionContract.networks[networkId].address;
    const priceFeedAddress = UsingPriceFeed.networks[networkId].address;

    const callContract = new web3.eth.Contract(CallOptionContract.abi, callAddress);
    const putContract = new web3.eth.Contract(PutOptionContract.abi, putAddress);
    const priceContract = new web3.eth.Contract(UsingPriceFeed.abi, priceFeedAddress);
    const daiContract = new web3.eth.Contract(DaiCoinABI.abi, "0x8ad3aa5d5ff084307d28c8f514d7a193b2bfe725");

    this.setState({ web3, accounts, callContract, putContract, priceContract, daiContract })
  }

  setLong = () => {
    this.setState({
      activeGreen: "green-box col-sm-6",
      activeRed: "col-sm-6",
      buttonColor: "green-bg",
      buttonText: "PLACE BUY ORDER",
      showType: this.state.selectedOption == 'put' ? true : false,
      position: 'long'
    })
  }

  setShort = () => {
    this.setState({
      activeGreen: "col-sm-6",
      activeRed: "red-box col-sm-6",
      buttonColor: "red-bg",
      buttonText: "PLACE SELL ORDER",
      showType: this.state.selectedOption == 'call' ? true : false,
      position: 'short'
    })
  }

  //Handle call/put change
  handleOptionChange = (e) => {
    e.preventDefault();
    this.setState({ selectedOption: e.target.value }, this.setLong)
  }

  //Handle type change
  handleTypeChange = (e) => {
    e.preventDefault();
    this.setState({ type: e.target.value });
  }

  onSubmit = async (e) => {
    e.preventDefault();

    //Call
    if (this.state.selectedOption == "call") {

      try {
        const tsp = this.state.strikeprice * this.state.quantity;
        const sp = this.state.web3.utils.toWei(tsp.toString());
        const cost = this.state.web3.utils.toWei(this.state.cost);
        const qty = this.state.web3.utils.toWei(this.state.quantity);

        //Long
        if (this.state.position == "long") {
          this.setState({ loading: true, buttonText: "Waiting for approval.." })
          //Approval
          await this.state.daiContract.methods.approve(this.state.callContract.options.address, cost).send({
            from: this.state.accounts[0]
          })

          this.setState({ buttonText: "Placing Order.." })

          //Create the Call Option
          await this.state.callContract.methods.createNewOptionLong(sp, cost, qty).send({
            from: this.state.accounts[0]
          })

          window.location.reload()
        } else {
          //Short
          const type = this.state.type;
          const margin = this.state.marketVal * 0.67;
          const marginT = this.state.web3.utils.toWei(margin.toString())

          if (type == 1) {
            this.setState({ loading: true, buttonText: "Waiting for approval.." })

            //Approval
            await this.state.daiContract.methods.approve(this.state.callContract.options.address, marginT).send({
              from: this.state.accounts[0]
            })

            this.setState({ buttonText: "Placing Order.." })

            //Create the Call Option
            await this.state.callContract.methods.createNewOptionShort(type, sp, cost, qty, marginT).send({
              from: this.state.accounts[0],
            })

            window.location.reload();
          } else {

            //Type 0
            this.setState({ loading: true, buttonText: "Placing Order.." })
            await this.state.callContract.methods.createNewOptionShort(type, sp, cost, qty, marginT).send({
              from: this.state.accounts[0],
              value: qty
            })

           
            window.location.reload();
          }

        }

        this.setState({ loading: false, strikeprice: "", cost: "", quantity: "" }, this.setLong)

      } catch (err) {
        this.setState({ loading: false }, this.setLong)
      }
    } else {
      //Put

      try {
        const tsp = this.state.strikeprice * this.state.quantity;
        const sp = this.state.web3.utils.toWei(tsp.toString());
        const cost = this.state.web3.utils.toWei(this.state.cost);
        const qty = this.state.web3.utils.toWei(this.state.quantity);
        //Long
        if (this.state.position == 'long') {
          const type = this.state.type;

          this.setState({ loading: true, buttonText: "Waiting for approval.." })
          //Approval
          await this.state.daiContract.methods.approve(this.state.putContract.options.address, cost).send({
            from: this.state.accounts[0]
          })

          this.setState({ buttonText: "Placing Order.." })

          //Create the Call Option
          await this.state.putContract.methods.createNewOptionLong(type, sp, cost, qty).send({
            from: this.state.accounts[0]
          })

         
          window.location.reload()
        } else {
          //Short
          this.setState({ loading: true, buttonText: "Waiting for approval.." })
          //Approval
          await this.state.daiContract.methods.approve(this.state.putContract.options.address, sp).send({
            from: this.state.accounts[0]
          })

          this.setState({ buttonText: "Placing Order.." })

          //Create the Call Option
          await this.state.putContract.methods.createNewOptionShort(sp, cost, qty, sp).send({
            from: this.state.accounts[0]
          })

          window.location.reload()
        }

        this.setState({ loading: false, strikeprice: "", cost: "", quantity: "" }, this.setLong)

      } catch (err) {
        alert(err)
      }
    }
  }

  validate = async (e) => {
    e.preventDefault();

    if (this.state.strikeprice <= 0 || this.state.quantity <= 0 || this.state.cost <= 0) {
      this.setState({ warnModalShow: true })
    } else {
      let marketVal = await this.state.priceContract.methods.getMarketValue().call();
      marketVal = this.state.web3.utils.fromWei(marketVal);
      marketVal *= this.state.quantity;
      this.setState({ marketVal, mainModalShow: true })
    }
  }

  render() {
    if(this.state.web3 == null){
      return (<div></div>);
    }
    return (
      <div className="new-order sec-bg text-white text-center">

        <div className="input-box-header">
          New Order
        </div>

        <div className="container">
          <div style={{ margin: "auto" }} className="row text-center mt-3">

            <div className="col-sm-8 font-weight-bold text-secondary">
              <div style={{ cursor: "pointer" }} className="row">
                <div onClick={this.setLong} className={this.state.activeGreen}>
                  Long
              </div>
                <div onClick={this.setShort} className={this.state.activeRed}>
                  Short
              </div>
              </div>
            </div>

            <div className="col-sm-4">
              <select onChange={this.handleOptionChange} className="float-right option-select">
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </div>

          </div>

          <div className="text-left mt-4">
            <form onSubmit={this.onSubmit} ref={f => (this.form = f)}>
              <div className="row">

                <div className="form-group col-sm-12">
                  <label for="strikeprice">Strike Price</label>
                  <input
                    placeholder="DAI / 1 ETH"
                    className="form-control form-control-sm"
                    type="number"
                    minLength={1}
                    step="any"
                    id="strikeprice"
                    value={this.state.strikeprice}
                    onChange={(e) => { this.setState({ strikeprice: e.target.value }) }}
                  />
                </div>

                <div className="form-group col-sm-6">
                  <label for="cost">Option Cost</label>
                  <input
                    placeholder="Option price in DAI"
                    className="form-control form-control-sm"
                    id="cost"
                    type="number"
                    required
                    step="any"
                    value={this.state.cost}
                    onChange={(e) => { this.setState({ cost: e.target.value }) }}
                  />
                </div>

                <div className="form-group col-sm-6">
                  <label for="qty">Quantity</label>
                  <input
                    placeholder="ETH quantity"
                    className="form-control form-control-sm"
                    id="qty"
                    type="number"
                    required
                    step="any"
                    value={this.state.quantity}
                    onChange={(e) => { this.setState({ quantity: e.target.value }) }}
                  />
                </div>

                <div className="form-group col-sm-12">
                  <label for="type">Settlement Type</label>
                  <select defaultValue={"0"} onChange={this.handleTypeChange} disabled={!this.state.showType} className="form-control" id="type">
                    <option value="0">ETH</option>
                    <option value="1">DAI</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={this.validate}
                className={"mt-1 text-white font-weight-bold btn btn-block " + this.state.buttonColor}
                disabled={this.state.loading}
                variant="">
                {this.state.loading && <Spinner
                  size="sm"
                  animation="grow"
                  className="mb-1 mr-2" />}
                {this.state.buttonText}
              </Button>

            </form>
          </div>
        </div>

        {/* Warning Modal */}
        <Modal className="text-white" show={this.state.warnModalShow} onHide={() => { this.setState({ warnModalShow: false }) }}>
          <Modal.Header className="head-bg" closeButton>
            <Modal.Title>Warning!</Modal.Title>
          </Modal.Header>
          <Modal.Body className="sec-bg">Please enter a valid amount for all the fields!</Modal.Body>
          <Modal.Footer className="head-bg">
            <Button variant="warning" onClick={() => { this.setState({ warnModalShow: false }) }}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Approval Modal */}
        <Modal className="text-white" show={this.state.mainModalShow} onHide={() => { this.setState({ mainModalShow: false }) }}>
          <Modal.Header className="head-bg" closeButton>
            <Modal.Title>Approval Request</Modal.Title>
          </Modal.Header>
          <Modal.Body className="sec-bg">
            {this.state.position == "long" &&
              <span>Please approve the options contract to retrieve <img src={require('../images/dai.png')} width="12" className="mx-1" />{this.state.cost} DAI from your
                  account, to be paid as premium to the seller.</span>
            }
            {this.state.selectedOption == "call" && this.state.position == "short" && this.state.type == '1' &&
              <span>Please approve the options contract to retrieve <img src={require('../images/dai.png')} width="12" className="mx-1" />{(0.67 * this.state.marketVal).toFixed(2)} DAI from your
                  account, as margin.</span>
            }
            {this.state.selectedOption == "call" && this.state.position == "short" && this.state.type == '0' &&
              <span>Please send the options contract <img src={require('../images/eth.png')} width="12" className="mx-1" />{this.state.quantity} ETH from your
                  account, to be given to the buyer at settlement.</span>
            }
            {this.state.selectedOption == "put" && this.state.position == "short" &&
              <span>Please approve the options contract to retrieve <img src={require('../images/dai.png')} width="12" className="mx-1" />{(1 * this.state.strikeprice).toFixed(2)} DAI from your
                  account, as margin.</span>
            }
          </Modal.Body>
          <Modal.Footer className="head-bg">
            <Button variant="danger" onClick={() => this.setState({ mainModalShow: false })}>
              Cancel
            </Button>
            <Button variant="success" onClick={() => {
              this.setState({ mainModalShow: false },
                () => { this.form.dispatchEvent(new Event("submit")) })
            }}>
              Approve
          </Button>
          </Modal.Footer>
        </Modal>

      </div>
    );
  }
}

export default NewOrder;