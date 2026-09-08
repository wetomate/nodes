# Duo expense reimbursement approval

## Quick overview

Collect an expense request, ask the manager for approval with Duo Push, and route the result to an approved or rejected outcome.

## How it works

1. The form collects the employee, expense description, amount, currency, date, and reference. Visible labels become the n8n output keys.
2. Set Approval Context preserves those submitted fields and adds the trusted manager username.
3. Check Manager Access calls Duo PREAUTH to check the manager account and available factors.
4. Request Manager Approval sends a synchronous Duo Push with safe expense context: reference, employee, amount, currency, and description.
5. Manager Approved? checks for an explicit Duo `allow` result and selects the approved or rejected branch.
6. Replace the outcome nodes with the finance, payroll, notification, or audit action used by your organization.

## Requirements

- A Duo Security Auth API application and credential.
- An enrolled Duo manager account.
- n8n with the Duo community node installed.
- A safe test expense and test finance destination.

## Setup

1. Import the workflow and create a Duo Security credential with the Auth API integration key, secret key, and hostname.
2. Open Set Approval Context and replace `manager@example.com` with a trusted Duo username. Use a trusted employee-to-manager lookup in a real process.
3. Open the form URL and submit a non-production expense so the manager receives the Duo Push.
4. Confirm that Push Info contains only safe context, then approve or deny the request in Duo Mobile.
5. Replace the approved and rejected outcome nodes with your finance, payroll, notification, and audit actions before activation.

## Inputs

The form uses its visible labels as keys:

    Employee name, Employee email, Expense description, Amount, Currency, Expense date, Expense reference

## Outputs

The branches add `status` (`approved` or `denied`) and `nextAction`. Preserve the original request fields when connecting finance or audit systems.

## Additional info

The workflow is inactive and uses a placeholder manager. Keep Push Info concise and exclude receipts, payment card details, credentials, tokens, and other secrets.
