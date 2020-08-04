import React, { Component } from 'react';

class Navbar extends Component {
  state = {};

  render() {
    return (
      <div
        style={{ background: '#000', borderRadius: '0' }}
        className='nav-custom'
      >
        <a
          href='/'
          style={{ cursor: 'pointer' }}
          className='text-white nav-brand'
        >
          newton
        </a>
        <div className='text-white wallet-add'>
          <img src={require('../images/add.png')} className='mr-1' width='24' />{' '}
          {this.props.accounts[0]}
        </div>
      </div>
    );
  }
}

export default Navbar;
