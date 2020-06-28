import React, { Component } from 'react';

class Home extends Component {
  state = {}
  render() {
    return (
      <div className="home">
        <nav class="navbar navbar-expand-lg">
          <a class="navbar-brand ml-3" href="/">newton</a>
          <ul style={{ marginRight: "20px" }} class="font-weight-bold navbar-nav ml-auto">
            <li class="nav-item">
              <a href="/faucet" class="text-secondary nav-link">Faucet (Test-only)</a>
            </li>
            <li class="nav-item">
              <a href="#" class="text-secondary nav-link">Demo</a>
            </li>
            <li class="nav-item">
              <a href="https://github.com/AnshuJalan/newton" class="text-secondary nav-link">Github</a>
            </li>
          </ul>
        </nav>
        <div className="container-fluid">
          <div className="custom-row row">
            <div class="col-sm-5 title-col">
              <span className="title-head">FAST. SECURE.</span>
              <span className="title">Decentralized Options Trading Platform</span>
              <span className="text-white">Newton is an options trading platform which supports settlement in ETH & DAI. It is powered by price feed from Tellor's decentralized oracles.</span>
              <button onClick={() => { this.props.history.push('/dashboard') }} className="btn btn-lg btn-trade btn-success">START TRADING</button>
            </div>
            <div className="img-col col-sm-7">
              <img style={{ width: "90%" }} src={require('./images/background.svg')} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Home;