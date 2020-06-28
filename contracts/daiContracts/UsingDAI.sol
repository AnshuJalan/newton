//SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 < 0.7.0;

import './DaiERC.sol';

contract UsingDAI{
    
    IERC20 public daiInstance;
    
    constructor(address _daiAddress) public{
        daiInstance = IERC20(_daiAddress);
    }
}
