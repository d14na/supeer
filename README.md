# Super P2P Server

[![Build Status](https://travis-ci.org/d14na/supeer.svg?branch=master)](https://travis-ci.org/d14na/supeer)

The primary purpose of this package is to facilitate seeding from peers *(especially on mobile devices)* located behind a corporate NAT or firewall.

## NAT Seeding (example)

1. (Mobile) client establishes a reverse proxy connection to a SUPeer.
2. Client listens for requests via the reverse proxy and seeding occurs as normal.
