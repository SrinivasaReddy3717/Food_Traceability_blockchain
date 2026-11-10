import { expect } from "chai";
import hre from "hardhat";

describe("BloodManagement", function () {
  async function deployContract() {
    const { ethers } = await hre.network.connect();

    const [admin, bloodBank, hospital] = await ethers.getSigners();

    const BloodManagement = await ethers.getContractFactory(
      "BloodManagement"
    );

    const bloodManagement = await BloodManagement.deploy();

    await bloodManagement.waitForDeployment();

    return {
      bloodManagement,
      admin,
      bloodBank,
      hospital,
    };
  }

  it("should deploy with the correct admin", async function () {
    const { bloodManagement, admin } = await deployContract();

    expect(await bloodManagement.getAdmin()).to.equal(admin.address);
  });

  it("should register a blood bank", async function () {
    const { bloodManagement, admin, bloodBank } = await deployContract();

    await bloodManagement
      .connect(admin)
      .registerBloodBank(bloodBank.address);

    expect(
      await bloodManagement.bloodBanks(bloodBank.address)
    ).to.equal(true);
  });

  it("should register a hospital", async function () {
    const { bloodManagement, admin, hospital } = await deployContract();

    await bloodManagement
      .connect(admin)
      .registerHospital(hospital.address);

    expect(
      await bloodManagement.hospitals(hospital.address)
    ).to.equal(true);
  });

  it("should complete the complete blood management workflow", async function () {
    const {
      bloodManagement,
      admin,
      bloodBank,
      hospital,
    } = await deployContract();

    // ------------------------------------------------
    // 1. Register Blood Bank
    // ------------------------------------------------

    await bloodManagement
      .connect(admin)
      .registerBloodBank(bloodBank.address);

    expect(
      await bloodManagement.bloodBanks(bloodBank.address)
    ).to.equal(true);

    // ------------------------------------------------
    // 2. Register Hospital
    // ------------------------------------------------

    await bloodManagement
      .connect(admin)
      .registerHospital(hospital.address);

    expect(
      await bloodManagement.hospitals(hospital.address)
    ).to.equal(true);

    // ------------------------------------------------
    // 3. Register Blood Unit
    // ------------------------------------------------

    const bloodUnitId = "BU001";
    const donationId = "DONATION001";

    const collectionDate = Math.floor(Date.now() / 1000);
    const expiryDate = collectionDate + 60 * 60 * 24 * 60;

    await bloodManagement
      .connect(bloodBank)
      .registerBloodUnit(
        bloodUnitId,
        "O+",
        donationId,
        "Chennai Blood Bank",
        collectionDate,
        expiryDate,
        "QmTestBloodCertificateCID"
      );

    const bloodUnit =
      await bloodManagement.getBloodUnit(bloodUnitId);

    expect(bloodUnit.bloodUnitId).to.equal(bloodUnitId);
    expect(bloodUnit.bloodGroup).to.equal("O+");
    expect(bloodUnit.donationId).to.equal(donationId);

    // ------------------------------------------------
    // 4. Change Blood Unit to AVAILABLE
    // ------------------------------------------------

    await bloodManagement
      .connect(bloodBank)
      .updateBloodUnitStatus(
        bloodUnitId,
        1
      );

    const availableUnit =
      await bloodManagement.getBloodUnit(bloodUnitId);

    expect(availableUnit.status).to.equal(1);

    // ------------------------------------------------
    // 5. Hospital creates blood request
    // ------------------------------------------------

    const requestId = "REQ001";

    await bloodManagement
      .connect(hospital)
      .createBloodRequest(
        requestId,
        "HOSP001",
        "O+",
        1,
        "Emergency"
      );

    const request =
      await bloodManagement.getBloodRequest(requestId);

    expect(request.requestId).to.equal(requestId);
    expect(request.hospitalId).to.equal("HOSP001");
    expect(request.bloodGroup).to.equal("O+");
    expect(request.quantity).to.equal(1);

    // ------------------------------------------------
    // 6. Blood bank approves request
    // ------------------------------------------------

    await bloodManagement
      .connect(bloodBank)
      .approveBloodRequest(
        requestId,
        [bloodUnitId]
      );

    const reservedUnit =
      await bloodManagement.getBloodUnit(bloodUnitId);

    expect(reservedUnit.status).to.equal(2);

    const approvedRequest =
      await bloodManagement.getBloodRequest(requestId);

    expect(approvedRequest.status).to.equal(3);
    expect(approvedRequest.bloodUnitIds[0]).to.equal(
      bloodUnitId
    );

    // ------------------------------------------------
    // 7. Transfer blood
    // ------------------------------------------------

    await bloodManagement
      .connect(bloodBank)
      .transferBloodRequest(requestId);

    const transitUnit =
      await bloodManagement.getBloodUnit(bloodUnitId);

    expect(transitUnit.status).to.equal(4);

    const transitRequest =
      await bloodManagement.getBloodRequest(requestId);

    expect(transitRequest.status).to.equal(4);

    // ------------------------------------------------
    // 8. Hospital receives blood
    // ------------------------------------------------

    await bloodManagement
      .connect(hospital)
      .deliverBloodRequest(requestId);

    const deliveredUnit =
      await bloodManagement.getBloodUnit(bloodUnitId);

    expect(deliveredUnit.status).to.equal(5);

    const deliveredRequest =
      await bloodManagement.getBloodRequest(requestId);

    expect(deliveredRequest.status).to.equal(5);

    // ------------------------------------------------
    // Final verification
    // ------------------------------------------------

    expect(deliveredUnit.bloodUnitId).to.equal(
      "BU001"
    );

    expect(deliveredUnit.bloodGroup).to.equal(
      "O+"
    );

    expect(deliveredRequest.requestId).to.equal(
      "REQ001"
    );
  });
});