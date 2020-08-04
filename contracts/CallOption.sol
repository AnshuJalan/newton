//SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;

import "./daiContracts/UsingDAI.sol";
import "./priceContract/UsingPriceFeed.sol";

contract CallOption is UsingDAI, UsingPriceFeed {
    using SafeMath for uint256;

    uint256 public uniqueId;

    enum POSITION {LONG, SHORT}

    /*
     * partyL - address for long position
     * partyS - address for short position
     * settlementType - 0: ETH, 1: DAI
     * cost - bid/ask price (10^18 DAI format)
     * quantity - underlying ether amount (Wei)
     * expiry - 48 hours from the time of creation
     * openPosition - Long/Short position which the counterparty would be taking
     */
    struct Option {
        bool isAvailable;
        bool settled;
        address partyL;
        address partyS;
        POSITION openPosition;
        uint256 id;
        uint256 settlementType;
        uint256 initialSellerMargin;
        uint256 strikePrice;
        uint256 cost;
        uint256 quantity;
        uint256 expiry;
    }

    mapping(uint256 => Option) public idToOption;
    mapping(address => uint256[]) public addressToOptions;

    constructor(address _daiAddress, address payable _tellorAddress)
        public
        UsingDAI(_daiAddress)
        UsingPriceFeed(_tellorAddress)
    {
        uniqueId = 1; //Initial value
    }

    /*
     * @notice Creates a new call option order for the Long/Buy position
     * @dev Must be preceded by an approve call to DAI token contract, during implementation
     * @dev Short party is initially set to 0x address
     * @param _quantity represents the amount of ether underlying the option
     * @param _cost is representing the bid amount for premium
     */
    function createNewOptionLong(
        uint256 _strikePrice,
        uint256 _cost,
        uint256 _quantity
    ) external {
        bool _costEscrowed;
        _costEscrowed = daiInstance.transferFrom(
            msg.sender,
            address(this),
            _cost
        );
        require(
            _costEscrowed,
            "Insuffcient amount approved for the option to transfer"
        );

        Option memory newOption = Option(
            true,
            false,
            msg.sender,
            address(0),
            POSITION.SHORT,
            uniqueId,
            0,
            0,
            _strikePrice,
            _cost,
            _quantity,
            now + 2 days
        );

        idToOption[uniqueId] = newOption;
        addressToOptions[msg.sender].push(uniqueId);

        uniqueId++;
    }

    /*
     * @notice Creates a new call option order for the Sell/Short position
     * @dev Must be preceded by approve call for type 1
     * @param _quantity represents the amount of ether underlying the option
     * @param _cost represents the ask amount for the premium
     * @param _type represents settle type. 0: ETH, 1: DAI
     */
    function createNewOptionShort(
        uint256 _type,
        uint256 _strikePrice,
        uint256 _cost,
        uint256 _quantity,
        uint256 _initialMargin
    ) external payable {
        require(_type == 0 || _type == 1, "Invalid settlement type!");

        if (_type == 0) {
            require(
                msg.value == _quantity,
                "Insufficient or incorrent amount of ether sent for escrow"
            );
        } else {
            uint256 marketVal = _quantity.mul(getMarketValue());
            marketVal = marketVal.div(10**18);
            uint256 requiredMargin = marketVal.sub(marketVal.div(3));

            require(
                _initialMargin >= requiredMargin,
                "Insufficient margin provided"
            );

            bool _marginEscrowed = daiInstance.transferFrom(
                msg.sender,
                address(this),
                _initialMargin
            );
            require(
                _marginEscrowed,
                "Insuffcient amount approved for the option to transfer"
            );
        }

        Option memory newOption = Option(
            true,
            false,
            address(0),
            msg.sender,
            POSITION.LONG,
            uniqueId,
            _type,
            _initialMargin,
            _strikePrice,
            _cost,
            _quantity,
            now + 2 days
        );

        idToOption[uniqueId] = newOption;
        addressToOptions[msg.sender].push(uniqueId);

        uniqueId++;
    }

    /*
     * @notice Join a shorted order
     * @dev Must be preceded by a approve call to DAI token contract, during implementation
     */
    function buyToOpen(uint256 _id) external isAvailable(idToOption[_id]) {
        //fetch option from mapping
        Option storage option = idToOption[_id];

        //Check if a valid option is being selected
        require(option.openPosition == POSITION.LONG, "Wrong option selected!");
        require(msg.sender != option.partyS, "You selected your own option!");

        bool _premiumSent;
        _premiumSent = daiInstance.transferFrom(
            msg.sender,
            address(this),
            option.cost
        );
        require(_premiumSent, "Insufficient DAI approved for premium!");

        //If premium sent to the contract, transfer rest to the short party
        daiInstance.transfer(option.partyS, option.cost);

        //Option positions filled
        option.isAvailable = false;
        option.partyL = msg.sender;

        //Add option to address list
        addressToOptions[msg.sender].push(_id);
    }

    /*
     *@notice Sell to a Long bid
     *@dev Approve call must precede for type 1 deals
     *@param _initialMargin is the amount of DAI sent for margin. Valid only for type 1 deals.
     */
    function sellToOpen(
        uint256 _id,
        uint256 _type,
        uint256 _initialMargin
    ) external payable isAvailable(idToOption[_id]) {
        //valid type check
        require(_type == 0 || _type == 1, "Invalid type selected!");

        //fetch option from mapping
        Option storage option = idToOption[_id];

        //Check if a valid option is being selected
        require(
            option.openPosition == POSITION.SHORT,
            "Wrong option selected!"
        );
        require(msg.sender != option.partyL, "You selected your own option!");

        if (_type == 0) {
            //ETH settlement: requires ETH equivalent to quantity to be sent
            require(
                msg.value == option.quantity,
                "Insufficient or incorrent amount of ether sent for escrow"
            );
        } else {
            //DAI settlement: 2/3 of the market value of the quantity of Eth specified
            uint256 marketVal = option.quantity.mul(getMarketValue());
            marketVal = marketVal.div(10**18);
            uint256 requiredMargin = marketVal.sub(marketVal.div(3));

            require(
                _initialMargin >= requiredMargin,
                "Insufficient margin provided"
            );

            bool _marginEscrowed = daiInstance.transferFrom(
                msg.sender,
                address(this),
                _initialMargin
            );
            require(
                _marginEscrowed,
                "Insuffcient amount approved for the option to transfer"
            );
        }

        //transfer premium 
        daiInstance.transfer(msg.sender, option.cost);

        //Option positions filled
        option.settlementType = _type;
        option.initialSellerMargin = _initialMargin;
        option.isAvailable = false;
        option.partyS = msg.sender;

        //Add options to address list
        addressToOptions[msg.sender].push(_id);
    }

    /*
     *@notice Settles a valid option. ETH/DAI settlement.
     *@dev Must be preceded by approve(strike) calls in the case for type 0
     */
    function settleOption(uint256 _id) external hasNotSettled(idToOption[_id]) {
        Option storage option = idToOption[_id];

        uint256 marketVal = option.quantity.mul(getMarketValue());
        marketVal = marketVal.div(10**18);

        require(marketVal > option.strikePrice, "Lossy close!");

        //Calls only by long position
        require(msg.sender == option.partyL, "Unauthorized call!");

        if (option.settlementType == 0) {
            //ETH settlement
            bool _escrowed = daiInstance.transferFrom(
                msg.sender,
                address(this),
                option.strikePrice
            );
            require(_escrowed, "Insuffcient DAI approved for transfer!");

            //transfer ETH
            address(uint160(msg.sender)).transfer(option.quantity);
            //transfer DAI to Seller
            daiInstance.transfer(option.partyS, option.strikePrice);
        } else {
            //DAI settlement
            uint256 profit = marketVal.sub(option.strikePrice);
            daiInstance.transfer(msg.sender, profit);

            //remaining DAI back to Seller
            uint256 remaining = option.initialSellerMargin.sub(profit);
            daiInstance.transfer(option.partyS, remaining);
        }

        option.settled = true;
    }

    /*
     *@notice Closes an expired or unwanted option
     */
    function closeOption(uint256 _id)
        external
        notFilledorExpired(idToOption[_id])
    {
        Option storage option = idToOption[_id];

        if (option.openPosition == POSITION.LONG) {
            require(msg.sender == option.partyS, "Not authorised!");

            if (option.settlementType == 0) {
                //Return Eth
                address(uint160(msg.sender)).transfer(option.quantity);
            } else {
                daiInstance.transfer(msg.sender, option.initialSellerMargin);
            }
        } else {
            require(msg.sender == option.partyL, "Not authorised!");
            daiInstance.transfer(msg.sender, option.cost);
        }

        option.settled = true;
        option.isAvailable = false;
    }

    /*
     * @notice Refunds the escrow margin for expired and not settled contracts
     */
    function refundExpired(uint256 _id)
        external
        isFilledandExpired(idToOption[_id])
    {
        Option storage option = idToOption[_id];

        require(msg.sender == option.partyS, "Wrong address!");

        if (option.settlementType == 0) {
            address(uint160(msg.sender)).transfer(option.quantity);
        } else {
            daiInstance.transfer(msg.sender, option.initialSellerMargin);
        }

        option.settled = true;
        option.isAvailable = false;
    }

    /*
     *@notice Utility to send number of contracts associated to a person
     */
    function getOptionsCount(address _address) public view returns (uint256) {
        return addressToOptions[_address].length;
    }

    modifier isFilledandExpired(Option memory option) {
        require(option.id != 0, "Invalid option");
        require(!option.isAvailable, "Option not filled!");
        require(!option.settled, "Already settled!");
        require(option.expiry < now, "Not yet expired!");
        _;
    }

    modifier notFilledorExpired(Option memory option) {
        require(
            option.isAvailable,
            "Option positions already filled or option no longer valid!"
        );
        require(option.id != 0, "Invalid option id");
        _;
    }

    modifier isAvailable(Option memory option) {
        require(
            option.isAvailable,
            "Option positions already filled or option no longer valid!"
        );
        require(option.id != 0, "Invalid option id");
        require(option.expiry > now, "Option has expired!");
        _;
    }

    modifier hasNotSettled(Option memory option) {
        require(option.id != 0, "Invalid option id");
        require(!option.isAvailable, "Option not yet confirmed!");
        require(!option.settled, "Option already settled");
        require(option.expiry > now, "Option expired!");
        _;
    }
}
