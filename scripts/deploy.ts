import { ethers } from 'hardhat';

async function main() {
  const XscrowFactory = await ethers.getContractFactory('XscrowFactory');
  console.log('before deploy');
  const xscrowFactory = await XscrowFactory.deploy(
    '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
    '0xCC79157eb46F5624204f47AB42b3906cAA40eaB7',
    ethers.utils.toUtf8Bytes('c1c5e92880894eb6b27d3cae19670aa3')
  );
  console.log('after deploy', xscrowFactory);
  const contract = await xscrowFactory.deployed();

  console.log('Deployed', contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
