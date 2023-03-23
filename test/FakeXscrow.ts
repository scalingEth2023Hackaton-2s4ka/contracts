import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeCreditOracle, FakeXscrow } from '../typechain-types';

describe('Fake Xscrow', () => {
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);
  let oracle: FakeCreditOracle;
  let owner: SignerWithAddress;
  let wallet1: SignerWithAddress;
  let fakeXscrow: FakeXscrow;

  beforeEach(async () => {
    [owner, wallet1] = await ethers.getSigners();
    oracle = await (await ethers.getContractFactory('FakeCreditOracle')).deploy();
    fakeXscrow = await (await ethers.getContractFactory('FakeXscrow')).deploy(oracle.address);
  });

  describe('deploy settings', () => {
    it('new', async () => {
      expect(fakeXscrow).to.not.be.null;
    });
  });

  describe('withdraw', () => {
    it('request withdraw', async () => {
      const transaction = await fakeXscrow.requestWithdraw();
      const transactionReceipt = await transaction.wait(1);
      const requestId = ethers.utils.parseBytes32String(transactionReceipt.events![0].topics[1]);
      const expectedRequestId = ethers.utils.parseBytes32String(await oracle.testRequestId());
      expect(requestId).to.equal(expectedRequestId);
    });
  });
});
