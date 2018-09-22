pragma solidity ^0.4.24;

/*******************************************************************************
 *
 * Copyright (c) 2018 Decentralization Authority MDAO.
 * Released under the MIT License.
 *
 * Zero Private Enterprise Network (0PEN)
 *
 * Empowers the Zer0net community with UNRESTRICTED access to
 * the FASTEST speed imaginable over a globally DISTRIBUTED, UNCENSORED,
 * TAMPER-PROOF communications network.
 *
 * Version 18.9.9
 *
 * Web    : https://d14na.org
 * Email  : support@d14na.org
 */


/*******************************************************************************
 *
 * SafeMath
 */
library SafeMath {
    function add(uint a, uint b) internal pure returns (uint c) {
        c = a + b;
        require(c >= a);
    }
    function sub(uint a, uint b) internal pure returns (uint c) {
        require(b <= a);
        c = a - b;
    }
    function mul(uint a, uint b) internal pure returns (uint c) {
        c = a * b;
        require(a == 0 || c / a == b);
    }
    function div(uint a, uint b) internal pure returns (uint c) {
        require(b > 0);
        c = a / b;
    }
}


/*******************************************************************************
 *
 * Owned contract
 */
contract Owned {
    address public owner;
    address public newOwner;

    event OwnershipTransferred(address indexed _from, address indexed _to);

    constructor() public {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        newOwner = _newOwner;
    }

    function acceptOwnership() public {
        require(msg.sender == newOwner);

        emit OwnershipTransferred(owner, newOwner);

        owner = newOwner;

        newOwner = address(0);
    }
}


/*******************************************************************************
 *
 * ERC Token Standard #20 Interface
 * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20-token-standard.md
 */
contract ERC20Interface {
    function totalSupply() public constant returns (uint);
    function balanceOf(address tokenOwner) public constant returns (uint balance);
    function allowance(address tokenOwner, address spender) public constant returns (uint remaining);
    function transfer(address to, uint tokens) public returns (bool success);
    function approve(address spender, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}


/*******************************************************************************
 *
 * @notice ZeroPEN - Zero Private Enterprise Network (0PEN)
 *
 * @dev Access management system for 0PEN.
 */
contract ZeroPEN is Owned {
    using SafeMath for uint;

    /* Initialize the ZeroGold contract. */
    ERC20Interface zeroGold;

    /* Define subscription types. */
    enum SubscriptionType {
        Unsubscribed,
        HODLRE,
        Monthly,
        Yearly
    }

    /* Definition of an subscriber. */
    struct Subscriber {
        SubscriptionType subscriptionType;
        uint expiration;
    }

    /* Initialize subscribers. */
    mapping(address => Subscriber) subscribers;

    /* Initialize value of ONE ZeroGold brick. */
    uint ONE_ZEROGOLD_BRICK = 100000000;

    /* Initialize events. */
    event Subscription(
        address indexed subscriberId,
        SubscriptionType subscriptionType,
        uint expiration
    );

    constructor() public  {
        /* Initialize the ZeroGold contract. */
        // NOTE We hard-code the address here, since it should never change.
        zeroGold = ERC20Interface(0x6ef5bca539A4A01157af842B4823F54F9f7E9968);
    }

    /**
     * @notice Determine the subscription status.
     *
     * @dev Called by the api server during connection authentication.
     */
    function isSubscribed(address _subscriberId) public view returns (bool) {
        /* Retrieve the total balance of this subscriber. */
        uint totalBalance = zeroGold.balanceOf(address(_subscriberId));

        /* Retrieve the subscription type. */
        SubscriptionType st = subscribers[_subscriberId].subscriptionType;

        /* Is this a HODLRE? */
        if (totalBalance > 0) {
            /* Is this HODLRE a PAID subscriber? */
            if (st != SubscriptionType.Monthly && st != SubscriptionType.Yearly) {
                /* Set the subscription type. */
                st = SubscriptionType.HODLRE;
            }

            /* Does this HODLRE have an "active" PAID subscription? */
            if (subscribers[_subscriberId].expiration < now) {
                /* Set the subscription type. */
                st = SubscriptionType.HODLRE;
            }

            /* HODLRE status requires a minimum of ONE ZeroGold brick. */
            if (st == SubscriptionType.HODLRE && totalBalance < ONE_ZEROGOLD_BRICK) {
                return false;
            }
        }

        /* Is this a PAID subscriber? */
        if (st == SubscriptionType.Unsubscribed) {
            return false;
        }

        /* Verify a future expiration date for this PAID subscriber. */
        if (st != SubscriptionType.HODLRE && subscribers[_subscriberId].expiration < now) {
            return false;
        }

        /* Okay! This account is "actively" subscribed. */
        return true;
    }

    /**
     * @notice Retrieve the (bandwidth) power allocation.
     *         Integer value (representing a percentage) between 1 - 100.
     *
     * @dev Called by the api server during bandwidth allocation.
     */
    function getPower(address _subscriberId) external view returns (uint) {
        /* Verify an active subscription. */
        if (!isSubscribed(_subscriberId)) {
            return 0;
        }

        /* Retrieve the total balance of this subscriber. */
        uint totalBalance = zeroGold.balanceOf(address(_subscriberId));

        /* Initialize subscription type. */
        SubscriptionType st = subscribers[_subscriberId].subscriptionType;

        /* Bandwidth power for Monthly & Yearly subscribers is 100. */
        // NOTE: HODLREs also have the option to become PAID subscribers.
        if (st == SubscriptionType.Monthly || st == SubscriptionType.Yearly) {
            return 100;
        }

        /* Is this a HODLRE? */
        if (totalBalance > 0) {
            /* Calculate the power. */
            uint power = totalBalance.div(ONE_ZEROGOLD_BRICK);

            /* Minimum balance required is ONE ZeroGold brick. */
            if (power < 1) {
                return 0;
            }

            /* Maximum balance staking is ONE HUNDRED ZeroGold bricks. */
            if (power > 100) {
                return 100;
            }

            return power;
        }

        /* This should NEVER reach this point, but just in case??. */
        return 0;
    }

    /**
     * @notice Retrieves the expiration date.
     */
    function getExpiration(address _subscriberId) external view returns (uint) {
        return subscribers[_subscriberId].expiration;
    }

    /**
     * @notice Retrieves the subscription type.
     */
    function getSubscriptionType(
        address _subscriberId
    ) external view returns (SubscriptionType) {
        /* Initialize subscription type. */
        SubscriptionType st = subscribers[_subscriberId].subscriptionType;

        /* Is this a PAID subscriber? */
        if (st == SubscriptionType.Monthly || st == SubscriptionType.Yearly) {
            return subscribers[_subscriberId].subscriptionType;
        }

        /* Retrieve the total balance of this subscriber. */
        uint totalBalance = zeroGold.balanceOf(address(_subscriberId));

        /* Is this a HODLRE? */
        if (totalBalance > 0) {
            return SubscriptionType.HODLRE;
        }

        return SubscriptionType.Unsubscribed;
    }

    /**
     * @notice Add a new subscription.
     *
     * @dev Creates a new subscription for a new subscriber.
     *      NOTE: Will fail, if subscriber already exists.
     */
    function addSubscriber(
        address _subscriberId,
        SubscriptionType _type
    ) external onlyOwner {
        /* Initialize subscription type. */
        SubscriptionType st = subscribers[_subscriberId].subscriptionType;

        if (st != SubscriptionType.Unsubscribed) {
            revert('Oops! This account already exists.');
        }

        /* DO NOT add invalid subscribers. */
        if (_type == SubscriptionType.Unsubscribed) {
            revert('Oops! You CANNOT add a subscriber of that type.');
        }

        /* DO NOT allow HODLREs to be added manually. */
        if (_type == SubscriptionType.HODLRE) {
            revert('Oops! You CANNOT add a HODLRE manually.');
        }

        /* Set the subscription type. */
        subscribers[_subscriberId].subscriptionType = _type;

        /* Initialize expiration. */
        uint expiration = 0;

        /* Calculate the expiration time. */
        if (_type == SubscriptionType.Monthly) {
            expiration = now + 30 days;
        } else if (_type == SubscriptionType.Yearly) {
            expiration = now + 365 days;
        }

        /* Set the expiration time. */
        subscribers[_subscriberId].expiration = expiration;

        /* Send an event notice. */
        emit Subscription(_subscriberId, _type, expiration);
    }

    /**
     * @notice Updates the subscriber's details.
     *
     * @dev Allows an account admin to manage subscription details.
     */
    function updateSubscriber(
        address _subscriberId,
        SubscriptionType _type,
        uint _expiration
    ) external onlyOwner {
        /* DO NOT allow HODLRE subscribers to be added manually. */
        if (_type == SubscriptionType.HODLRE) {
            revert('Oops! You CANNOT add a HODLRE manually.');
        }

        /* Set the subscription type. */
        subscribers[_subscriberId].subscriptionType = _type;

        /* Set the expiration. */
        subscribers[_subscriberId].expiration = _expiration;

        /* Send an event notice. */
        emit Subscription(_subscriberId, _type, _expiration);
    }

    /**
     * THIS CONTRACT DOES NOT ACCEPT DIRECT ETHER
     */
    function () public payable {
        /* Cancel this transaction. */
        revert('Oops! Direct payments are NOT permitted here.');
    }

    /**
     * Transfer Any ERC20 Token
     *
     * @notice Owner can transfer out any accidentally sent ERC20 tokens.
     *
     * @dev Provides an ERC20 interface, which allows for the recover
     *      of any accidentally sent ERC20 tokens.
     */
    function transferAnyERC20Token(
        address tokenAddress, uint tokens
    ) public onlyOwner returns (bool success) {
        return ERC20Interface(tokenAddress).transfer(owner, tokens);
    }
}
