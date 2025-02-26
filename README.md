# LiquidityLocker

A smart contract on the Aptos testnet that locks liquidity tokens for a set duration, built for the Chingari Aptos hAIckathon.

## Features
- **lock_tokens**: Locks APT tokens for a specified time (e.g., 300 seconds).
- **unlock_tokens**: Releases tokens after the lock period ends.

## Deployment
- Deployed on testnet: [Transaction](https://explorer.aptoslabs.com/txn/0x663f720419be891a17649f654528ce39a0c44f2d4fee6e7b03bb0508b2a82647?network=testnet)
- Address: `0x03f4fe0fa07e8733ca0eb08be6d46e8ae929afdc33222164d79f5cdc89137970`

## Usage
- Lock 2 APT for 5 minutes: `aptos move run --function-id 0x03f4...7970::Locker::lock_tokens --args u64:2 u64:300`
- Unlock: `aptos move run --function-id 0x03f4...7970::Locker::unlock_tokens`
- Check locked amount: See resources on [Aptos Explorer](https://explorer.aptoslabs.com/account/0x03f4fe0fa07e8733ca0eb08be6d46e8ae929afdc33222164d79f5cdc89137970?network=testnet).
