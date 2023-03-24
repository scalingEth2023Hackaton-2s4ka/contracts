import { ethers } from 'hardhat';

async function main() {
  const linkToken = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
  const operator = '0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD';
  const jobId = ethers.utils.toUtf8Bytes('c1c5e92880894eb6b27d3cae19670aa3');
  const XscrowFactory = await ethers.getContractFactory('XscrowFactory');

  console.log('before deploy');
  const xscrowFactory = await XscrowFactory.deploy(
    linkToken,
    operator,
    jobId
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
