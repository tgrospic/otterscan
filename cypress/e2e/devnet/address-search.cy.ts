import { Wallet } from "ethers";

type SentTx = {
  blockNumber: number;
  hash: string;
};

const txHashAt = (index: number) =>
  cy.get('[data-test="tx-hash"]').eq(index).invoke("text");

const firstTxHash = () => txHashAt(0);

const lastTxHash = () => cy.get('[data-test="tx-hash"]').last().invoke("text");

const sendTransactions = (targetAddr: string, count: number) => {
  const sent: SentTx[] = [];
  return cy
    .wrap(Array.from({ length: count }, (_, index) => index))
    .each((index) => {
      const value = 1_000_000_000n * BigInt(+index + 1);
      cy.sendTx({ to: targetAddr, value }).then(({ txReceipt }) => {
        sent.push({
          blockNumber: txReceipt.blockNumber,
          hash: txReceipt.hash,
        });
      });
    })
    .then(() => sent);
};

describe("Advanced address transaction search", () => {
  it("Searches by address and paginates both directions", () => {
    const targetAddr = Wallet.createRandom().address;

    sendTransactions(targetAddr, 60).then((sent) => {
      cy.visit("/");
      cy.get('[data-test="home-search-input"]').type(`${targetAddr}{enter}`);
      cy.get('[data-test="address"]', { timeout: 15_000 }).contains(targetAddr);

      cy.get('[data-test="page-count"]')
        .first()
        .invoke("text")
        .should("equal", "25");
      firstTxHash().should("equal", sent[59].hash);
      lastTxHash().should("equal", sent[35].hash);

      cy.get('[data-test="nav-next"]').first().click();
      firstTxHash().should("equal", sent[34].hash);
      lastTxHash().should("equal", sent[10].hash);

      cy.get('[data-test="nav-prev"]').first().click();
      firstTxHash().should("equal", sent[59].hash);
      lastTxHash().should("equal", sent[35].hash);
    });
  });

  it("Navigates with browser back after paginating", () => {
    const targetAddr = Wallet.createRandom().address;

    sendTransactions(targetAddr, 60).then((sent) => {
      cy.visit(`/address/${targetAddr}/txs/last`);
      cy.get('[data-test="address"]', { timeout: 15_000 }).contains(targetAddr);
      firstTxHash().should("equal", sent[24].hash);
      lastTxHash().should("equal", sent[0].hash);

      cy.get('[data-test="nav-prev"]').first().click();
      firstTxHash().should("equal", sent[49].hash);
      lastTxHash().should("equal", sent[25].hash);

      cy.get('[data-test="nav-prev"]').first().click();
      firstTxHash().should("equal", sent[59].hash);
      lastTxHash().should("equal", sent[50].hash);

      cy.go("back");
      firstTxHash().should("equal", sent[49].hash);
      lastTxHash().should("equal", sent[25].hash);
    });
  });

  it("Navigates to transactions after a target block number", () => {
    const targetAddr = Wallet.createRandom().address;

    sendTransactions(targetAddr, 60).then((sent) => {
      cy.visit(`/address/${targetAddr}/txs/next?b=${sent[24].blockNumber}`);
      cy.get('[data-test="address"]', { timeout: 15_000 }).contains(targetAddr);
      firstTxHash().should("equal", sent[24].hash);
      lastTxHash().should("equal", sent[0].hash);

      cy.get('[data-test="nav-prev"]').first().click();
      firstTxHash().should("equal", sent[49].hash);
      lastTxHash().should("equal", sent[25].hash);

      cy.get('[data-test="nav-next"]').first().click();
      firstTxHash().should("equal", sent[24].hash);
      lastTxHash().should("equal", sent[0].hash);
    });
  });

  it("Treats an extremely large block number as the first page", () => {
    const targetAddr = Wallet.createRandom().address;

    sendTransactions(targetAddr, 30).then((sent) => {
      cy.visit(`/address/${targetAddr}/txs/next?b=12345678910`);
      cy.get('[data-test="address"]', { timeout: 15_000 }).contains(targetAddr);
      firstTxHash().should("equal", sent[29].hash);
      lastTxHash().should("equal", sent[5].hash);

      cy.get("a")
        .contains("Last")
        .should("have.class", "text-xs text-link-blue");
      cy.get("span")
        .contains("First")
        .should("have.class", "text-xs text-gray-400");
    });
  });
});
