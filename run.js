const fs = require("fs");
const chalk = require("chalk");
const readline = require("readline");
const figlet = require("figlet");
const { AptosClient, AptosAccount, TxnBuilderTypes, BCS, HexString } = require("aptos");

const NODE_URL = "https://testnet.bardock.movementnetwork.xyz/v1";
const MODULE_ID = "0xf7429cda18fc0dd78d0dc48b102158024f1dc3a511a2a65ea553b5970d65b028::eigenfi_move_vault_hstmove";
const FUNCTION_NAME = "stake";

const client = new AptosClient(NODE_URL);

// Fungsi delay dengan countdown
function countdown(seconds) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(chalk.green(`⏳ Menunggu ${seconds} detik...`));
      seconds--;

      if (seconds < 0) {
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

function randomAmount(min = 0.09, max = 0.3) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(6));
}

async function stake(account, amount) {
  console.log(chalk.green(`🔁 Staking dari: ${account.address().hex()}`));
  const STAKE_OCTAS = BigInt(Math.floor(amount * 1e6));

  const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
    TxnBuilderTypes.EntryFunction.natural(
      MODULE_ID,
      FUNCTION_NAME,
      [],
      [BCS.bcsSerializeUint64(STAKE_OCTAS)]
    )
  );

  const [{ sequence_number }, chainId] = await Promise.all([
    client.getAccount(account.address()),
    client.getChainId(),
  ]);

  const rawTxn = new TxnBuilderTypes.RawTransaction(
    TxnBuilderTypes.AccountAddress.fromHex(account.address()),
    BigInt(sequence_number),
    entryFunctionPayload,
    1110n,
    100n,
    BigInt(Math.floor(Date.now() / 1000) + 600),
    new TxnBuilderTypes.ChainId(chainId)
  );

  const bcsTxn = AptosClient.generateBCSTransaction(account, rawTxn);

  try {
    const tx = await client.submitSignedBCSTransaction(bcsTxn);
    console.log(chalk.green(`⏳ deposit terkirim: ${tx.hash}`));
    const result = await client.waitForTransactionWithResult(tx.hash);
    if (result.success) {
      console.log(chalk.green(`✅ TX Success: ${tx.hash}`));
    } else {
      console.log(chalk.red(`❌ TX Failed: ${tx.hash}\nStatus: ${result.vm_status}`));
    }
  } catch (err) {
    console.error(chalk.red(`❗ Gagal submit TX:`, err.message || err));
  }
}

async function main() {
  console.clear();
  console.log(
    chalk.green(
      figlet.textSync("ANAM", {
        font: "Block",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );

  const lines = fs.readFileSync("wallet.txt", "utf8").split("\n").filter(Boolean);

  while (true) {
    for (const keyHex of lines) {
      const amount = randomAmount();
      try {
        const account = new AptosAccount(HexString.ensure(keyHex.trim()).toUint8Array());
        console.log(chalk.green(`💸 Jumlah staking: ${amount} MOVE`));
        await stake(account, amount);
      } catch (err) {
        console.error(chalk.red(`❗ Error dengan key: ${keyHex}\n`, err.message || err));
      }

      const delaySec = Math.floor(Math.random() * (45 - 10 + 1) + 10);
      await countdown(delaySec);
    }
  }
}

main();
