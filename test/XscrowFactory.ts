import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { FakeToken, LinkToken, XscrowFactory } from '../typechain-types';

describe('XscrowFactory', () => {
  let xscrowFactory: XscrowFactory;
  let owner: SignerWithAddress;
  let wallet1: SignerWithAddress;
  let lenderTreasury: SignerWithAddress;
  let vendorTreasury: SignerWithAddress;
  let operator: SignerWithAddress;
  let fakeToken: FakeToken;
  let fakeLinkToken: LinkToken;
  let jobId: Uint8Array;

  beforeEach(async () => {
    jobId = ethers.utils.toUtf8Bytes('7da2702f37fd48e5b1b9a5715e3509b6');
    [owner, wallet1, lenderTreasury, vendorTreasury, operator] = await ethers.getSigners();
    fakeToken = await (await ethers.getContractFactory('FakeToken')).deploy('TokenX', 'TKX');
    fakeLinkToken = await (await ethers.getContractFactory('LinkToken')).deploy();
    xscrowFactory = await (
      await ethers.getContractFactory('XscrowFactory')
    ).deploy(fakeLinkToken.address, operator.address, jobId);
  });

  it('new', () => {
    expect(xscrowFactory).to.not.be.null;
  });

  it('create', async () => {
    await xscrowFactory.create(
      'aXscrowName',
      fakeToken.address,
      lenderTreasury.address,
      vendorTreasury.address,
      'https://anApiUrl.com?address='
    );

    expect(await xscrowFactory.xscrowProduct(owner.address, 0)).to.not.null;
  });

  it('deploy event', async () => {
    await new Promise(async (resolve, reject) => {
      const filter = xscrowFactory.filters.Deployed(owner.address);
      xscrowFactory.once(filter, (owner_: any, id_: any, product: any) => {
        try {
          expect(owner_).to.equal(owner.address);
          expect(id_).to.equal(0);
          expect(product.xscrow).to.not.be.null;
          expect(product.oracle).to.not.be.null;
          resolve(true);
        } catch (error) {
          reject(false);
        }
      });

      await xscrowFactory.create(
        'aXscrowName',
        fakeToken.address,
        lenderTreasury.address,
        vendorTreasury.address,
        'https://anApiUrl.com?address='
      );
    });
  });
});
