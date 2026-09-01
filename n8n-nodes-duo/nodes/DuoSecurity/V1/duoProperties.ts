import type { INodeProperties } from 'n8n-workflow';

const commonExtraAuthFields: INodeProperties[] = [
	{
		displayName: 'Hostname',
		name: 'hostname',
		type: 'string',
		default: '',
		placeholder: 'Ex: johns-laptop or webserver01.company.com',
		description: 'The host name of the device accessing the application',
	},
	{
		displayName: 'IP Address',
		name: 'ipaddr',
		type: 'string',
		default: '',
		placeholder: 'Ex: 192.168.1.1',
		description:
			'If an Auth API client does not send the ipaddr (IP address of the user) value in a request, policy settings based on available IP address information have no effect',
	},
];

export const duoProperties: INodeProperties[] = [
	{
		displayName: 'Endpoints',
		name: 'endpoint',
		type: 'options',
		options: [
			{
				name: 'AUTH',
				value: 'auth',
				description:
					"The /auth endpoint performs second-factor authentication for a user by sending a push notification to the user's smartphone app, verifying a passcode, or placing a phone call",
			},
			{
				name: 'AUTH STATUS',
				value: 'auth_status',
				description:
					'The /auth_status endpoint "long-polls" for the next status update from the authentication process for a given transaction',
			},
			{
				name: 'CHECK',
				value: 'check',
				description:
					'The /check endpoint can be called to verify that the Auth API integration and secret keys are valid, and that the signature is being generated properly',
			},
			{
				name: 'LOGO',
				value: 'logo',
				description:
					'The /logo endpoint provides a programmatic way to retrieve your stored logo',
			},
			{
				name: 'PING',
				value: 'ping',
				description:
					"The /ping endpoint acts as a 'liveness check' that can be called to verify that Duo is up before trying to call other Auth API endpoints",
			},
			{
				name: 'PREAUTH',
				value: 'preauth',
				description:
					"The /preauth endpoint determines whether a user is authorized to log in, and (if so) returns the user's available authentication factors",
			},
		],
		default: 'auth',
		description: 'Choose an Endpoints',
		builderHint: {
			message:
				'Choose PING to check availability, PREAUTH to check user access, AUTH to start authentication, or AUTH STATUS to read an asynchronous authentication result.',
		},
	},
	{
		displayName: 'Identify User By',
		name: 'userIdentifier',
		type: 'resourceLocator',
		default: { mode: 'username', value: '' },
		required: true,
		description:
			'User_id: Permanent Duo-generated ID. Always points to the same user, even if their username changes. Best for stable references. username: App-level identifier (e.g., user@domain.com). Easier to use with existing systems, but may break if the username or alias changes.',
	builderHint: {
		message: 'Use the stable Duo user ID when available; otherwise use the username known by the application.',
	},
		modes: [
			{
				displayName: 'Username',
				name: 'username',
				type: 'list',
				placeholder: 'Ex: John Miller',
			},
			{
				displayName: 'User ID',
				name: 'user_id',
				type: 'list',
				placeholder: 'Ex: DUT7R9FA3APHMTQEXHSO',
			},
		],
		displayOptions: {
			show: {
				endpoint: ['auth', 'preauth'],
			},
		},
	},
	{
		displayName: 'Transaction ID',
		name: 'txid',
		type: 'string',
		default: '',
		placeholder: 'Ex: 56477e31-97bb-45ca-a7c0-e8d6e13c63dc',
		description:
			'The transaction ID of the authentication attempt, as returned by the /auth endpoint',
		builderHint: {
			message: 'Use the transaction ID returned by AUTH when checking an asynchronous authentication attempt.',
		},
		displayOptions: {
			show: {
				endpoint: ['auth_status'],
			},
		},
	},
	{
		displayName: 'Authentication Factor',
		name: 'factor',
		type: 'options',
		options: [
			{
				name: 'Auto',
				value: 'auto',
				description:
					"Use the out-of-band factor (push or phone) recommended by Duo as the best for the user's devices",
			},
			{
				name: 'Passcode',
				value: 'passcode',
				description:
					'Authenticate the user with a passcode (from Duo Mobile, SMS, hardware token, or bypass code)',
			},
			{
				name: 'Phone Call',
				value: 'phone',
				description: 'Authenticate the user with phone callback',
			},
			{
				name: 'Push Notification',
				value: 'push',
				description: 'Authenticate the user with Duo Push',
			},
			{
				name: 'SMS Message',
				value: 'sms',
				description:
					'Send SMS passcodes, but it won’t authenticate—always returns "deny"; re-prompt user afterward',
			},
		],
		default: 'push',
		displayOptions: {
			show: {
				endpoint: ['auth'],
			},
		},
		required: true,
		description: 'Factor to use for authentication',
		builderHint: {
			message: 'Use Push Notification for an approval request, or choose another factor only when the workflow requires it.',
		},
	},
	{
		displayName: 'Passcode',
		name: 'passcode',
		type: 'string',
		default: '',
		placeholder: 'Ex: 123456',
		displayOptions: {
			show: {
				endpoint: ['auth'],
				factor: ['passcode'],
			},
		},
		description: 'Passcode entered by the user',
	},
	{
		displayName: 'Device',
		name: 'device',
		type: 'string',
		default: 'auto',
		placeholder: 'auto or device ID',
		displayOptions: {
			show: {
				endpoint: ['auth'],
				factor: ['auto', 'push', 'phone', 'sms'],
			},
		},
		description: "Identifies which of the user's devices this is",
	},
	{
		displayName: 'Push Info',
		name: 'pushinfo',
		placeholder: 'Add key/value',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		description:
			'Optional key/value pairs with context for the authentication attempt, shown in Duo Mobile (e.g., from=login portal&domain=example.com), total length under 20 KB',
		builderHint: {
			message: 'Include only non-secret context such as the event, action, and target shown to the approver.',
		},
		displayOptions: {
			show: {
				endpoint: ['auth'],
				'/factor': ['push'],
			},
		},
		options: [
			{
				displayName: 'Key-Value Pairs',
				name: 'pairs',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Auth Optional Fields',
		name: 'authOptionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				endpoint: ['auth'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Async',
				name: 'async',
				type: 'boolean',
				default: true,
				description:
					'Whether you enable async, your application provides this parameter with a value of true, /auth will immediately return a transaction ID and will be able to retrieve real-time status updates from the authentication process',
			},
			{
				displayName: 'Display Username',
				name: 'display_username',
				type: 'string',
				default: '',
				placeholder: 'Ex: John Miller',
				description: "String to display in Duo Mobile in place of the user's Duo username",
				displayOptions: {
					show: {
						'/factor': ['push'],
					},
				},
			},
			...commonExtraAuthFields,
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'Ex: Login, Admin Access, SSH...',
				description:
					'This string appears in Duo Mobile push notifications and UI. By default, Duo shows a standard phrase with the app name, but you can provide a custom string (not localized) to replace it.',
				displayOptions: {
					show: {
						'/factor': ['push'],
					},
				},
			},
		],
	},
	{
		displayName: 'PreAuth Optional Fields',
		name: 'preAuthOptionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				endpoint: ['preauth'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Verified Push Support?',
				name: 'clientSupportsVerifiedPush',
				type: 'boolean',
				default: false,
				description:
					'Whether set to 1 or not determines if your client supports Verified Duo Push; without it, the API assumes no support, ignores related policy, and push may be unavailable under certain risk-based restrictions',
			},
			...commonExtraAuthFields,
			{
				displayName: 'Trusted Device Token',
				name: 'trustedDeviceToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder:
					'Ex: REkxSzP00Ld4ddEVTRZOUlYMEl8RFVVQkdJ05HwUldRRThJR1VTNE0=||1627133735|8356ef7779bb0ec4c28ca9b04dc50493c4d2e05e',
				description:
					"If trusted_device_token is present and the policy allows Remembered Devices, the API returns 'allow' for the token's lifetime set by the administrator",
			},
		],
	},
];
