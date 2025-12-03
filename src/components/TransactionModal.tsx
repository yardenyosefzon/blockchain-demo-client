import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Code,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { approveTransaction, buildAndSignTransaction } from '@/services/api';
import type { BuildSignResponse, Wallet } from '@/services/api';
import { formatAmount, shorten } from '@/utils/format';

type Props = {
  opened: boolean;
  wallets: WalletWithPending[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
};

type WalletWithPending = Wallet & { pendingBalance?: number };

const generatePrivateKey = (): string => {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('');
};

export function TransactionModal({ opened, wallets, onClose, onSuccess }: Props) {
  const [active, setActive] = useState(0);
  const [sender, setSender] = useState<string | null>(null);
  const [receiver, setReceiver] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [fee, setFee] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [originalPrivateKey, setOriginalPrivateKey] = useState('');
  const [buildResult, setBuildResult] = useState<BuildSignResponse | null>(null);
  const [building, setBuilding] = useState(false);
  const [approving, setApproving] = useState(false);
  const senderWallet = useMemo(
    () => wallets.find((wallet) => wallet.address === sender),
    [wallets, sender],
  );

  const confirmedBalance = senderWallet?.balance ?? 0;
  const pendingBalance = senderWallet?.pendingBalance ?? confirmedBalance;
  const availableToSpend = Math.max(0, Math.min(confirmedBalance, pendingBalance));

  let numericAmount: number | null;
  if (typeof amount === 'number') {
    numericAmount = amount;
  } else if (amount === '') {
    numericAmount = null;
  } else {
    numericAmount = Number(amount);
  }

  let numericFee: number;
  if (typeof fee === 'number') {
    numericFee = fee;
  } else if (fee === '') {
    numericFee = 0;
  } else {
    numericFee = Number(fee);
  }

  const normalizedAmount =
    numericAmount !== null && Number.isFinite(numericAmount) ? numericAmount : null;
  const normalizedFee = Number.isFinite(numericFee) ? numericFee : 0;
  const totalSpend = normalizedAmount !== null ? normalizedAmount + normalizedFee : null;
  const amountTooHigh =
    totalSpend !== null && Number.isFinite(totalSpend) && totalSpend > availableToSpend;
  const amountError = amountTooHigh
    ? `Amount${normalizedFee ? ' + fee' : ''} exceeds available balance (${formatAmount(
        availableToSpend,
      )} coins).`
    : null;

  useEffect(() => {
    if (!sender) return;
    const wallet = wallets.find((w) => w.address === sender);
    const key = wallet?.privateKey ?? '';
    setOriginalPrivateKey(key);
    setPrivateKey(key);
  }, [sender, wallets]);

  const options = useMemo(
    () =>
      wallets.map((wallet) => {
        const name = wallet.name ?? shorten(wallet.address);
        const publicKey = shorten(wallet.publicKey);
        return {
          value: wallet.address,
          label: publicKey ? `${name} (${publicKey})` : name,
        };
      }),
    [wallets],
  );

  const resetState = () => {
    setActive(0);
    setSender(null);
    setReceiver(null);
    setAmount('');
    setFee('');
    setNote('');
    setPrivateKey('');
    setOriginalPrivateKey('');
    setBuildResult(null);
    setBuilding(false);
    setApproving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const nextStep = () => setActive((current) => Math.min(current + 1, 3));
  const prevStep = () => setActive((current) => Math.max(current - 1, 0));

  const canProceedStepOne =
    sender &&
    receiver &&
    sender !== receiver &&
    normalizedAmount !== null &&
    normalizedAmount > 0 &&
    !amountTooHigh;
  const canProceedStepTwo = Boolean(privateKey);

  const handleGenerateNewKey = () => {
    setPrivateKey(generatePrivateKey());
    setBuildResult(null)
  };

  const handleRestoreOriginalKey = () => {
    setPrivateKey(originalPrivateKey);
    setBuildResult(null);
  };

  const handleBuild = async () => {
    if (!sender || !receiver || normalizedAmount === null || normalizedAmount <= 0 || amountTooHigh) {
      return;
    }
    const feePayload = Number.isFinite(numericFee) ? numericFee : undefined;
    setBuilding(true);
    try {
      const result = await buildAndSignTransaction({
        sender_address: sender,
        receiver_address: receiver,
        amount: normalizedAmount,
        fee: feePayload,
        note: note.trim() || undefined,
        private_key: privateKey || undefined,
      });
      setBuildResult(result);
      notifications.show({
        color: 'green',
        title: 'Transaction signed',
        message: 'Transaction built and signed successfully.',
      });
    } catch (error) {
      setBuildResult(null);
      notifications.show({
        color: 'red',
        title: 'Failed to sign transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBuilding(false);
    }
  };

  const handleApprove = async () => {
    if (!buildResult) return;
    setApproving(true);
    try {
      const response = await approveTransaction(buildResult);
      notifications.show({
        color: 'green',
        title: 'Transaction approved',
        message: (() => {
          if (typeof response === 'string') return response;
          if (typeof response === 'object' && response !== null && 'message' in response) {
            const msg = (response as { message?: unknown }).message;
            if (typeof msg === 'string') return msg;
          }
          return 'Transaction moved to mempool.';
        })(),
      });
      await onSuccess();
      handleClose();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Approval failed',
        message: 'Invalid transaction',
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Send Transaction" size="lg">
      <Stack>
        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm">
          <Stepper.Step label="Participants" description="Pick sender, receiver & amount" />
          <Stepper.Step label="Sign" description="Confirm the private key" />
          <Stepper.Step label="Build + Sign" description="Generate signed transaction" />
          <Stepper.Step label="Approve" description="Submit to mempool" />
        </Stepper>

        {active === 0 && (
          <Stack>
            <Select
              label="Sender"
              placeholder="Select sender wallet"
              data={options}
              value={sender}
              onChange={setSender}
              searchable
              nothingFoundMessage="No wallets"
            />
            <Select
              label="Receiver"
              placeholder="Select receiver wallet"
              data={options}
              value={receiver}
              onChange={setReceiver}
              searchable
              nothingFoundMessage="No wallets"
            />
            <NumberInput
              label="Amount"
              placeholder="Amount to send"
              value={amount}
              error={amountError ?? undefined}
              description={
                senderWallet
                  ? `Available to send: ${formatAmount(availableToSpend)} coins (confirmed ${formatAmount(confirmedBalance)}${senderWallet.pendingBalance !== undefined ? `, pending ${formatAmount(pendingBalance)}` : ''})`
                  : undefined
              }
              onChange={(value) => {
                if (value === '' || value === null) {
                  setAmount('');
                  return;
                }
                setAmount(typeof value === 'number' ? value : Number(value));
              }}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="Fee"
              placeholder="Optional fee"
              value={fee}
              onChange={(value) => {
                if (value === '' || value === null) {
                  setFee('');
                  return;
                }
                setFee(typeof value === 'number' ? value : Number(value));
              }}
              min={0}
              thousandSeparator=","
            />
            <Textarea
              label="Note"
              placeholder="Optional transaction note"
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
            <Group justify="space-between">
              <div />
              <Button onClick={nextStep} disabled={!canProceedStepOne}>
                Next
              </Button>
            </Group>
          </Stack>
        )}

        {active === 1 && (
          <Stack>
            <TextInput
              color="red"
              label="Sender private key"
              description={
                <Text size="sm" c="red" component="span">
                  For demo purposes this key is shown and editable. Try generating a different
                  secret to see the transaction approval fail.
                </Text>
              }
              value={privateKey}
              placeholder="Private key"
              readOnly
            />
            {!privateKey && (
              <Text c="dimmed" size="sm">
                This wallet does not expose a private key. You can still continue, but signing may
                fail.
              </Text>
            )}
            <Group gap="xs">
              <Button variant="light" onClick={handleGenerateNewKey}>
                Generate new key
              </Button>
              <Button
                variant="light"
                onClick={handleRestoreOriginalKey}
                disabled={!originalPrivateKey || privateKey === originalPrivateKey}
              >
                Restore original key
              </Button>
            </Group>
            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep} disabled={!canProceedStepTwo}>
                Next
              </Button>
            </Group>
          </Stack>
        )}

        {active === 2 && (
          <Stack>
            <Text size="sm" c="dimmed">
              When you build and sign, the API returns the raw transaction, public key and
              signature.
            </Text>
            {buildResult && (
              <Stack gap="xs">
                <div>
                  <Text fw={500}>Public key</Text>
                  <Code block>{buildResult.pub}</Code>
                </div>
                <div>
                  <Text fw={500}>Signature</Text>
                  <Code block>{buildResult.sign}</Code>
                </div>
                <div>
                  <Text fw={500}>Transaction</Text>
                  <Code block>{JSON.stringify(buildResult.tx, null, 2)}</Code>
                </div>
              </Stack>
            )}
            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Group>
                <Button onClick={handleBuild} loading={building} variant="light">
                  Build &amp; Sign
                </Button>
                <Button onClick={nextStep} disabled={!buildResult}>
                  Next
                </Button>
              </Group>
            </Group>
          </Stack>
        )}

        {active === 3 && buildResult && (
          <Stack>
            <Text size="sm">
              Ready to submit the signed transaction to the mempool. Approving will refresh wallet
              balances automatically.
            </Text>
            <div>
              <Text fw={500} mb="xs">
                Transaction summary
              </Text>
              <Code block>{JSON.stringify(buildResult.tx, null, 2)}</Code>
            </div>
            <Group justify="space-between">
              <Button variant="default" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={handleApprove} loading={approving}>
                Approve
              </Button>
            </Group>
          </Stack>
        )}

        {active === 3 && !buildResult && (
          <Stack>
            <Text c="red">Transaction data missing. Please rebuild before approving.</Text>
            <Button variant="default" onClick={() => setActive(2)}>
              Back to build step
            </Button>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

export default TransactionModal;
