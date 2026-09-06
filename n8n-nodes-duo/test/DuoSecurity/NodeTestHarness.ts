/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { mock } from 'jest-mock-extended';
import { Container } from '@n8n/di';
import {
	ICredentials,
	ICredentialsHelper,
	NodeHelpers,
	UnexpectedError,
	Workflow,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type ICredentialTypes,
	type IExecuteData,
	type IHttpRequestHelper,
	type IHttpRequestOptions,
	type INode,
	type INodeCredentialsDetails,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypes,
	type IRequestOptionsSimplified,
	type IVersionedNodeType,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	type WorkflowExecuteMode,
	type WorkflowTestData,
} from 'n8n-workflow';
import { WorkflowExecute } from 'n8n-core/dist/execution-engine/workflow-execute';
import type { SsrfBridge } from 'n8n-core/dist/execution-engine';
import { ExecutionLifecycleHooks } from 'n8n-core/dist/execution-engine/execution-lifecycle-hooks';
import { SSHClientsManager } from 'n8n-core/dist/execution-engine/ssh-clients-manager';
import nock from 'nock';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type HarnessOptions = {
	nodeTypes: Record<string, INodeType | IVersionedNodeType>;
	credentialTypes: Record<string, ICredentialType>;
};

type TestOptions = {
	credentials?: Record<string, ICredentialDataDecryptedObject>;
	workflowFiles: string[];
	nock?: WorkflowTestData['nock'];
	customAssertions?: () => void;
};

class TestNodeTypes implements INodeTypes {
	constructor(private readonly nodeTypes: HarnessOptions['nodeTypes']) {}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		const type = this.nodeTypes[nodeType];
		if (!type) throw new UnexpectedError(`Unknown node type: ${nodeType}`);
		return type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.getByName(nodeType), version);
	}

	getKnownTypes() {
		return {};
	}
}

class TestCredentialTypes implements ICredentialTypes {
	constructor(private readonly credentialTypes: HarnessOptions['credentialTypes']) {}

	recognizes(credentialType: string): boolean {
		return credentialType in this.credentialTypes;
	}

	getByName(credentialType: string): ICredentialType {
		const type = this.credentialTypes[credentialType];
		if (!type) throw new UnexpectedError(`Unknown credential type: ${credentialType}`);
		return type;
	}

	getSupportedNodes(): string[] {
		return [];
	}

	getParentTypes(_typeName: string): string[] {
		void _typeName;
		return [];
	}
}

class TestCredentials extends ICredentials {
	constructor(
		details: INodeCredentialsDetails,
		type: string,
		private value: ICredentialDataDecryptedObject,
	) {
		super(details, type);
	}

	getData() {
		return this.value;
	}

	getDataToSave() {
		return {
			id: this.id,
			name: this.name,
			type: this.type,
			data: '',
		};
	}

	setData(data: ICredentialDataDecryptedObject) {
		this.value = data;
	}
}

class TestCredentialsHelper extends ICredentialsHelper {
	constructor(
		private readonly credentialTypes: TestCredentialTypes,
		private readonly credentials: Record<string, ICredentialDataDecryptedObject>,
	) {
		super();
	}

	getParentTypes(type: string): string[] {
		return this.credentialTypes.getParentTypes(type);
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		typeName: string,
		requestOptions: IHttpRequestOptions | IRequestOptionsSimplified,
	): Promise<IHttpRequestOptions> {
		const authenticate = this.credentialTypes.getByName(typeName).authenticate;
		if (typeof authenticate === 'function') {
			return await authenticate(credentials, requestOptions as IHttpRequestOptions);
		}
		return requestOptions as IHttpRequestOptions;
	}

	async preAuthentication(
		_helpers: IHttpRequestHelper,
		_credentials: ICredentialDataDecryptedObject,
		_typeName: string,
		_node: INode,
		_credentialsExpired: boolean,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		void [_helpers, _credentials, _typeName, _node, _credentialsExpired];
		return undefined;
	}

	async getCredentials(
		nodeCredentials: INodeCredentialsDetails,
		type: string,
	): Promise<ICredentials> {
		return new TestCredentials(nodeCredentials, type, this.credentials[type] ?? {});
	}

	async getDecrypted(
		_additionalData: IWorkflowExecuteAdditionalData,
		_nodeCredentials: INodeCredentialsDetails,
		type: string,
		_mode: WorkflowExecuteMode,
		_executeData?: IExecuteData,
	): Promise<ICredentialDataDecryptedObject> {
		void [_additionalData, _nodeCredentials, _mode, _executeData];
		return this.credentials[type] ?? {};
	}

	async updateCredentials(): Promise<void> {}

	async updateCredentialsOauthTokenData(): Promise<void> {}

	getCredentialsProperties(type: string): INodeProperties[] {
		return this.credentialTypes.getByName(type).properties;
	}
}

export class NodeTestHarness {
	private readonly nodeTypes: TestNodeTypes;

	private readonly credentialTypes: TestCredentialTypes;

	constructor(options: HarnessOptions) {
		this.nodeTypes = new TestNodeTypes(options.nodeTypes);
		this.credentialTypes = new TestCredentialTypes(options.credentialTypes);

		beforeEach(() => nock.disableNetConnect());
		afterEach(() => {
			nock.cleanAll();
			nock.enableNetConnect();
		});
		afterAll(() => Container.get(SSHClientsManager).onShutdown());
	}

	setupTests(options: TestOptions) {
		for (const workflowFile of options.workflowFiles) {
			const workflowData = this.readWorkflow(workflowFile);
			const description = workflowData.name ?? workflowFile.replace('.json', '');

			test(description, async () => {
				if (options.nock) this.setupNetworkMocks(options.nock);
				const expectedOutput = workflowData.pinData;
				if (!expectedOutput) {
					throw new UnexpectedError('Workflow data does not contain pinData');
				}
				delete workflowData.pinData;

				const result = await this.executeWorkflow(workflowData, options.credentials ?? {});
				this.assertOutput(result, expectedOutput);
				options.customAssertions?.();
			});
		}
	}

	private readWorkflow(workflowFile: string): IWorkflowBase {
		return JSON.parse(
			readFileSync(path.resolve(__dirname, workflowFile), 'utf8'),
		) as IWorkflowBase;
	}

	private setupNetworkMocks({ baseUrl, mocks }: NonNullable<WorkflowTestData['nock']>) {
		const scope = nock(baseUrl);
		for (const mockDefinition of mocks) {
			let interceptor = scope[mockDefinition.method](
				mockDefinition.path,
				mockDefinition.requestBody,
			);
			for (const [name, value] of Object.entries(mockDefinition.requestHeaders ?? {})) {
				interceptor = interceptor.matchHeader(name, value);
			}
			interceptor.reply(
				mockDefinition.statusCode,
				mockDefinition.responseBody,
				mockDefinition.responseHeaders,
			);
		}
	}

	private async executeWorkflow(
		workflowData: IWorkflowBase,
		credentials: Record<string, ICredentialDataDecryptedObject>,
	) {
		const workflow = new Workflow({
			id: 'duo-node-test',
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			nodeTypes: this.nodeTypes,
			settings: workflowData.settings,
			active: false,
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const ssrfBridge = mock<SsrfBridge>();
		ssrfBridge.validateUrl.mockResolvedValue({ ok: true, result: undefined });
		ssrfBridge.validateIp.mockReturnValue({ ok: true, result: undefined });
		Object.assign(additionalData, {
			executionId: 'duo-node-test',
			currentNodeExecutionIndex: 0,
			currentNodeParameters: undefined,
			formWaitingBaseUrl: 'http://localhost:5678/waiting',
			webhookWaitingBaseUrl: 'http://localhost:5678/waiting',
			ssrfBridge,
		});
		(additionalData as unknown as { hooks: ExecutionLifecycleHooks }).hooks =
			new ExecutionLifecycleHooks('manual', 'duo-node-test', workflowData);
		additionalData.credentialsHelper = new TestCredentialsHelper(
			this.credentialTypes,
			credentials,
		);

		return await new WorkflowExecute(additionalData, 'manual').run({ workflow });
	}

	private assertOutput(
		result: Awaited<ReturnType<WorkflowExecute['run']>>,
		expected: IWorkflowBase['pinData'],
	) {
		expect(result.status).toBe('success');

		for (const [nodeName, expectedItems] of Object.entries(expected ?? {})) {
			const actualItems = result.data.resultData.runData[nodeName]?.[0]?.data?.main[0];
			expect(actualItems).toEqual(expectedItems as INodeExecutionData[]);
		}
	}
}
