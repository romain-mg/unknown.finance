import { expect } from "chai";

import { createInstance } from "../instance";
import { reencryptEuint256 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { debug } from "../utils";
import { deployERC20EncryptionWrapperFixture } from "./ERC20EncryptionWrapper.fixture";
import { deployERC20Fixture } from "./testERC20.fixture";

describe("ConfidentialERC20Wrapper", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const erc20 = await deployERC20Fixture("ERC20", "ERC20");
    const wrapperContract = await deployERC20EncryptionWrapperFixture("ConfidentialERC20Wrapper", "CERC20", erc20);
    this.wrapperContractAddress = await wrapperContract.getAddress();
    this.erc20 = erc20;
    this.wrapperContract = wrapperContract;
    this.fhevm = await createInstance();
  });

  it("should wrap the erc20 into a confidential erc20", async function () {
    const mintErc20 = await this.erc20.mint(this.signers.alice, 1000);
    await mintErc20.wait();
    const approveErc20 = await this.erc20.connect(this.signers.alice).approve(this.wrapperContractAddress, 1000);
    await approveErc20.wait();
    const wrapErc20 = await this.wrapperContract.depositFor(this.signers.alice, 1000);
    await wrapErc20.wait();
    // Reencrypt Alice's balance
    const balanceHandleAlice = await this.wrapperContract.balanceOf(this.signers.alice);
    const encryptedTokenBalanceAlice = await reencryptEuint256(
      this.signers.alice,
      this.fhevm,
      balanceHandleAlice,
      this.wrapperContractAddress,
    );
    expect(encryptedTokenBalanceAlice).to.equal(1000);
    const originalTokenBalanceAlice = await this.erc20.balanceOf(this.signers.alice);
    expect(originalTokenBalanceAlice).to.equal(0);
    const totalSupply = await this.wrapperContract.totalSupply();
    expect(totalSupply).to.equal(1000);
  });

  it("should unwrap the confidential erc20 into the original erc20", async function () {
    const mintErc20 = await this.erc20.mint(this.signers.alice, 1000);
    await mintErc20.wait();
    const approveErc20 = await this.erc20.connect(this.signers.alice).approve(this.wrapperContractAddress, 1000);
    await approveErc20.wait();
    const wrapErc20 = await this.wrapperContract.depositFor(this.signers.alice, 1000);
    await wrapErc20.wait();
    const withdrawErc20 = await this.wrapperContract.withdrawTo(this.signers.alice, 1000);
    await withdrawErc20.wait();
    const balanceAlice = await this.erc20.balanceOf(this.signers.alice);
    expect(balanceAlice).to.equal(1000);
  });
});
