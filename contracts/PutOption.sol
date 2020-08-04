//SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.7.0;

import "./daiContracts/UsingDAI.sol";
import "./priceContract/UsingPriceFeed.sol";

contract PutOption is UsingDAI, UsingPriceFeed {
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
     * @notice Creates a new put option order for the Long/Buy position
     * @dev Must be preceded by a approve call to DAI token contract, during implementation
     * @dev Short party is initially set to 0 address
     * @param _quantity represents the amount of ether underlying the option
     * @param _type is the settlement type. 0:ETH, 1:DAI
     * @param _cost is representing the bid amount for premium
     */
    function createNewOptionLong(
        uint256 _type,
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
            _type,
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
     * @dev Must be preceded by approve call
     * @param _quantity represents the amount of ether underlying the option
     * @param _cost represents the ask amount for the premium
     * @param _initialMargin: equal to or greater than the strike price
     */
    function createNewOptionShort(
        uint256 _strikePrice,
        uint256 _cost,
        uint256 _quantity,
        uint256 _initialMargin
    ) external {
        require(_initialMargin >= _strikePrice, "Insufficient margin provided");

        bool _marginEscrowed = daiInstance.transferFrom(
            msg.sender,
            address(this),
            _initialMargin
        );
        require(
            _marginEscrowed,
            "Insuffcient amount approved for the option to transfer"
        );

        Option memory newOption = Option(
            true,
            false,
            address(0),
            msg.sender,
            POSITION.LONG,
            uniqueId,
            0,
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
    function buyToOpen(uint256 _id, uint256 _type)
        external
        isAvailable(idToOption[_id])
    {
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

        //If premium sent to the contrac transfer to the short party
        daiInstance.transfer(option.partyS, option.cost);

        //Option positions filled
        option.isAvailable = false;
        option.partyL = msg.sender;
        option.settlementType = _type;

        //Add option to address list
        addressToOptions[msg.sender].push(_id);
    }

    /*
     *@notice Sell to a Long bid
     *@dev Approve call must precede
     *@param _initialMargin is the amount of DAI sent for margin
     */
    function sellToOpen(uint256 _id, uint256 _initialMargin)
        external
        isAvailable(idToOption[_id])
    {
        //fetch option from mapping
        Option storage option = idToOption[_id];

        //Check if a valid option is being selected
        require(
            option.openPosition == POSITION.SHORT,
            "Wrong option selected!"
        );
        require(msg.sender != option.partyL, "You selected your own option!");

        require(
            _initialMargin >= option.strikePrice,
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

        //transfer premium
        daiInstance.transfer(msg.sender, option.cost);

        option.initialSellerMargin = _initialMargin;
        option.isAvailable = false;
        option.partyS = msg.sender;

        //Add option to address list
        addressToOptions[msg.sender].push(_id);
    }

    /*
     *@notice Settles a valid option. ETH/DAI settlement.
     *@dev Must be preceded by approve(strike) calls in the case for type 0
     */
    function settleOption(uint256 _id)
        external
        payable
        hasNotSettled(idToOption[_id])
    {
        Option storage option = idToOption[_id];

        uint256 marketVal = option.quantity.mul(getMarketValue());
        marketVal = marketVal.div(10**18);

        require(option.strikePrice > marketVal, "Lossy close!");

        //Calls only by long position
        require(msg.sender == option.partyL, "Unauthorized call!");

        if (option.settlementType == 0) {
            //ETH settlement
            require(
                msg.value == option.quantity,
                "Insuffcient DAI approved for transfer!"
            );

            //transfer ETH
            address(uint160(option.partyS)).transfer(option.quantity);
            //transfer DAI to buyer
            daiInstance.transfer(option.partyL, option.strikePrice);
        } else {
            //DAI settlement
            uint256 profit = option.strikePrice.sub(marketVal);
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
            daiInstance.transfer(msg.sender, option.initialSellerMargin);
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

        daiInstance.transfer(msg.sender, option.initialSellerMargin);

        option.settled = true;
        option.isAvailable = false;
    }

    /*
     *@notice Utility to send number of contracts associated to a person
     */
    function getOptionsCount(address _address) public view returns (uint256) {
        return addressToOptions[_address].length;
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

    modifier isFilledandExpired(Option memory option) {
        require(option.id != 0, "Invalid option");
        require(!option.isAvailable, "Option not filled!");
        require(!option.settled, "Already settled!");
        require(option.expiry < now, "Not yet expired!");
        _;
    }

    modifier hasNotSettled(Option memory option) {
        require(option.id != 0, "Invalid option id");
        require(!option.isAvailable, "Option not yet confirmed!");
        require(!option.settled, "Option already settled");
        require(option.expiry > now, "Option has expired!");
        _;
    }
}
