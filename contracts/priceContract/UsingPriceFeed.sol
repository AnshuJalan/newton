//SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;

import "usingtellor/contracts/UsingTellor.sol";

contract UsingPriceFeed is UsingTellor {

    using SafeMath for uint;

    uint256 requestIdEth;
    uint256 requestIdDai;

    constructor(address payable _tellorAddress) public UsingTellor(_tellorAddress){
        requestIdEth = 1; //ETH/USD
        requestIdDai = 39; //DAI/USD
    }

    /*
    *@notice returns the current market value of ETH/DAI after adjusting the granularity
    */
    function getMarketValue() public view returns (uint256) {
        uint _eth;
        uint _dai;
        uint _adjustedPrice;

        bool _didGet;
        uint _timeStamp;

        //ETH/USD
        (_didGet, _eth, _timeStamp) = getDataBefore(requestIdEth, now - 1 hours);
        if(!_didGet){
            (, _eth, ) = getCurrentValue(requestIdEth);
        }

        //DAI/USD
        (_didGet, _dai, _timeStamp) = getDataBefore(requestIdDai, now - 1 hours);
        if(!_didGet){
            (, _dai, ) = getCurrentValue(requestIdDai);
        }

        //Granularity adjustment
        _eth = _eth.mul(10**18);
        _adjustedPrice = _eth.div(_dai);

        return _adjustedPrice;
    }

    /*
    *@notice returns ETH/USD market value in last 24 hours  
    */
    function getEthRange() external view returns(uint, uint){
        bool _didGet;
        uint _timeStamp;
        uint _ethNow;
        uint _ethPast;

        (_didGet, _ethNow, _timeStamp) = getDataBefore(requestIdEth, now - 1 hours);
        if(!_didGet){
            (, _ethNow, ) = getCurrentValue(requestIdEth);
        }

        (_didGet, _ethPast, _timeStamp) = getDataBefore(requestIdEth, now - 24 hours);
        if(!_didGet){
            (, _ethPast, ) = getCurrentValue(requestIdEth);
        } 

        return (_ethPast, _ethNow);
    }

    /*
    *@notice returns DAI/USD market value in last 24 hours  
    */
    function getDaiRange() external view returns(uint, uint){
        bool _didGet;
        uint _timeStamp;
        uint _daiNow;
        uint _daiPast;

        (_didGet, _daiNow, _timeStamp) = getDataBefore(requestIdDai, now - 1 hours);
        if(!_didGet){
            (, _daiNow, ) = getCurrentValue(requestIdDai);
        }

        (_didGet, _daiPast, _timeStamp) = getDataBefore(requestIdDai, now - 24 hours);
        if(!_didGet){
            (, _daiPast, ) = getCurrentValue(requestIdDai);
        }

        return (_daiPast, _daiNow);
    }

    
}
