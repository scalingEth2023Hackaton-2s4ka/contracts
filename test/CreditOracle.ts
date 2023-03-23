import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CreditOracle, FakeOperator, FakeXscrow, LinkToken } from '../typechain-types';

describe('Credit Oracle', () => {
  ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);
  let jobId: Uint8Array;
  let oracle: CreditOracle;
  let fakeXscrow: FakeXscrow;
  let owner: SignerWithAddress;
  let fakeLinkToken: LinkToken;
  let wallet1: SignerWithAddress;
  let fakeOperator: FakeOperator;

  const linkAmount = '1000000000000000000';
  const xscrowRejectedMsg = 'Caller is not the xscrow';
  const ownableRejectedMsg = 'Ownable: caller is not the owner';
  const anApiUrl = 'https://anurl.com';

  beforeEach(async () => {
    jobId = ethers.utils.toUtf8Bytes('7da2702f37fd48e5b1b9a5715e3509b6');
    [owner, wallet1] = await ethers.getSigners();
    fakeLinkToken = await (await ethers.getContractFactory('LinkToken')).deploy();

    fakeOperator = await (await ethers.getContractFactory('FakeOperator')).deploy(fakeLinkToken.address);

    oracle = await (
      await ethers.getContractFactory('CreditOracle')
    ).deploy(fakeLinkToken.address, fakeOperator.address, jobId, anApiUrl);

    fakeXscrow = await (await ethers.getContractFactory('FakeXscrow')).deploy(oracle.address);

    await oracle.updateXscrow(fakeXscrow.address);

    await fakeLinkToken.connect(owner).transfer(oracle.address, linkAmount);
  });

  describe('deploy settings', () => {
    it('new', async () => {
      expect(oracle).to.not.be.null;
    });
  });

  describe('request oracle', () => {
    it('request credit data', async () => {
      await oracle.updateXscrow(owner.address);
      const transaction = await oracle.requestCreditDataOf(wallet1.address);
      const transactionReceipt = await transaction.wait(1);
      const requestId = transactionReceipt.events![0].topics[1];

      expect(requestId).to.not.be.null;
    });

    it('request credit data from no xscrow', async () => {
      await expect(oracle.requestCreditDataOf(wallet1.address)).rejectedWith(xscrowRejectedMsg);
    });

    it('fulfill call from no operator', async () => {
      await expect(oracle.fulfill(ethers.utils.defaultAbiCoder.encode(['bool'], [true]), true)).rejectedWith(
        'Source must be the oracle of the request'
      );
    });

    it('request fulfill through fake oracle from xscrow', async () => {
      await new Promise(async (resolve) => {
        const filter = oracle.filters.DataFulfilled(wallet1.address);
        oracle.once(filter, (aPayee: any, canWithdraw: any) => {
          expect(wallet1.address).to.equal(aPayee);
          expect(canWithdraw).to.equal(true);
          resolve(true);
        });

        const transactionReceipt = await (await fakeXscrow.connect(wallet1).requestWithdraw()).wait(1);
        await fakeOperator.fulfillOracleRequest(
          transactionReceipt.events![0].topics[1],
          ethers.utils.defaultAbiCoder.encode(['bool'], [true])
        );
      });
    });
  });

  describe('updatable properties', () => {
    it('owner can update xscrow address', async () => {
      await oracle.updateXscrow(wallet1.address);
      expect(await oracle.xscrow()).to.equal(wallet1.address);
    });

    it('not owner cannot update xscrow', async () => {
      await expect(oracle.connect(wallet1).updateXscrow(wallet1.address)).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update api url', async () => {
      await oracle.updateApiUrl(anApiUrl);

      expect(await oracle.apiUrl()).to.equal(anApiUrl);
    });

    it('not owner cannot update api url', async () => {
      await expect(oracle.connect(wallet1).updateApiUrl(anApiUrl)).to.revertedWith(ownableRejectedMsg);
    });

    it('not owner cannot read api url', async () => {
      await expect(oracle.connect(wallet1).apiUrl()).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update job id', async () => {
      const jobIdString = ethers.utils.toUtf8Bytes('7da2702f37fd48e5b1b9a5715e350943');
      const newJobId = ethers.utils.keccak256(jobIdString);

      await oracle.updateJobId(newJobId);

      expect(await oracle.jobId()).to.equal(newJobId);
    });

    it('not owner cannot update job id', async () => {
      const jobIdString = ethers.utils.toUtf8Bytes('7da2702f37fd48e5b1b9a5715e350943');
      const newJobId = ethers.utils.keccak256(jobIdString);

      await expect(oracle.connect(wallet1).updateJobId(newJobId)).to.revertedWith(ownableRejectedMsg);
    });

    it('not owner cannot read job id', async () => {
      await expect(oracle.connect(wallet1).jobId()).to.revertedWith(ownableRejectedMsg);
    });

    it('owner can update operator address', async () => {
      await oracle.updateOperator(wallet1.address);

      expect(await oracle.operator()).to.equal(wallet1.address);
    });

    it('not owner cannot update operator address', async () => {
      await expect(oracle.connect(wallet1).updateOperator(wallet1.address)).to.revertedWith(ownableRejectedMsg);
    });

    it('not owner cannot read operator address', async () => {
      await expect(oracle.connect(wallet1).operator()).to.revertedWith(ownableRejectedMsg);
    });
  });

  describe('link withdraw', () => {
    it('owner can withdraw link', async () => {
      const initialBalance = await fakeLinkToken.balanceOf(owner.address);

      await oracle.withdrawLink();

      expect(await fakeLinkToken.balanceOf(owner.address)).to.equal(initialBalance.add(linkAmount));
    });

    it('not owner cannot withdraw link', async () => {
      await expect(oracle.connect(wallet1).withdrawLink()).to.revertedWith(ownableRejectedMsg);
    });
  });
});
