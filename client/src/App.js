import React, { Component } from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Faucet from './Faucet';
import Dashboard from './Dashboard';
import Home from './home';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route path='/' exact component={Home} />
          <Route path='/faucet' component={Faucet} />
          <Route path='/dashboard' component={Dashboard} />
        </Switch>
      </BrowserRouter>
    );
  }
}

export default App;
