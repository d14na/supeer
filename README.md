# SUPeer — P2P Management Services

[![Build Status](https://travis-ci.org/d14na/supeer.svg?branch=master)](https://travis-ci.org/d14na/supeer)

> NOTE: The primary purpose and goal of this package is to facilitate **hi-availability seeding** over p2p networks from **"common" peers** *(especially on mobile devices)* serviced behind restricted corporate **NATs and firewalls.**

## 0̸PEN - Zero Private Enterprise Network

> Pronounced  **OPEN** /'əʊpən/

A premium network, offering ***reliable, hi-speed bandwidth*** to average users; and a marketplace, offering ***distributed, streaming*** content broadcasting for businesses.

## Default Communications Ports

          0̸PEN Network : 10443
    BitTorrent Network : 6888

## Communication Gateways

0̸PEN convenietnly provides gateways to some of the most popular decentralized storage & communication networks:

1. [IPFS - InterPlanetary File System](https://en.wikipedia.org/wiki/InterPlanetary_File_System)
2. [Ethereum Swarm](https://github.com/ethersphere/swarm)
3. [STORJ](https://en.wikipedia.org/wiki/STORJ)
4. [TOR - The Onion Router](https://en.wikipedia.org/wiki/Tor_(anonymity_network)
5. [I2P - Invisible Internet Project](https://en.wikipedia.org/wiki/I2P)

## NAT Seeding via (Web)Sockets

1. *(Mobile)* client establishes a websocket connection to a SUPeer *(running TURN services).*
2. Client listens/handles requests via the SUPeer's tunnel and seeding occurs as normal.

## Enterprise Onion Router (EOR) *WIP*

> TL;DR — An enterprise-level onion routing network, with anonymity and security similar to TOR, but equipped to handle hi-speed data services *(eg. live event streaming).*

### Sample EOR (Circuit) Gateway

    T-Mobile ( Amazon AWS ( Private Internet Access ) )

In this example, a user would **(1)** first connect to T-Mobile's 3G/4G/5G **Mobile** Network; **(2)** data/traffic would be wrapped around Amazon's **Global** AWS network; finally **(3)** data/traffic would be wrapped around the **Exit Node** managed by Private Internet Access (PIA).

*(this is an ambitious & optimistic, but wholly fictitious example)*

PIA would NOT be aware of the source user's IP address; and T-Mobile would NOT be aware of the user's final IP destination. AWS serves only as a **privacy-enhancing middle-man.**

As these are ALL premium, hi-speed networks, latency would be kept to a minimum; and **support hi-speed data services** normally reserved for your average "unprotected" broadband user, but strictly NOT available via early onion networks such as TOR.

## 0PEN Decentralization

In order to guarantee the **protection of 0̸PEN** and the spread of decentralization; we will be looking to offer a **"monetarily" incentivized solution** for hosts as soon as possible.

Primarily we will be targeting ISPs, Academic Institutions and Large-scale Enterprises *(basically anyone with the infrastructure to support a shit-ton of bandwidth and throughput at high availability).*

Before this opportunity can be presented, we will first need to develop a **Proof-of-Integrity (POI)** system to protect the data/files of the hosts operating on the network. This will assure users of a **unified platform** upon which to trust their data access needs.

*(POI does NOT exist today)*

---

## Development Roadmap — 2018

* [ ] Add [STUN](https://en.wikipedia.org/wiki/STUN) services
* [ ] Add [ICE](https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment) services
* [ ] Add [TURN](https://en.wikipedia.org/wiki/Traversal_Using_Relay_NAT) services
* [ ] Complete proof-of-concept for EOR

## Development Roadmap — 2019

* [ ] Draft a proposal for POI
