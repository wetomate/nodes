import { RestApiBasicAuthApi } from '../../../credentials/RestApiBasicAuthApi.credentials';
import { RestApiHeaderAuthApi } from '../../../credentials/RestApiHeaderAuthApi.credentials';
import { RestApiJwtAuthApi } from '../../../credentials/RestApiJwtAuthApi.credentials';
import packageManifest from '../../../package.json';
import { RestApi } from '../RestApi.node';

describe('REST API node description', () => {
	it('uses an icon path relative to the registered node entry point', () => {
		const node = new RestApi();
		const version = node.nodeVersions[1];

		expect(node.description.icon).toBe('file:rest-api.svg');
		expect(version.description.icon).toEqual({
			light: 'file:rest-api.svg',
			dark: 'file:rest-api-dark.svg',
		});
	});

	it('uses package-owned credentials for every authentication mode', () => {
		const node = new RestApi();
		const credentials = node.nodeVersions[1].description.credentials;

		expect(credentials?.map(({ name }) => name)).toEqual([
			'restApiBasicAuthApi',
			'restApiHeaderAuthApi',
			'restApiJwtAuthApi',
		]);
	});

	it('registers every referenced credential entry point in the package', () => {
		expect(packageManifest.n8n.credentials).toEqual([
			'dist/credentials/RestApiBasicAuthApi.credentials.js',
			'dist/credentials/RestApiHeaderAuthApi.credentials.js',
			'dist/credentials/RestApiJwtAuthApi.credentials.js',
		]);
	});

	it.each([
		[new RestApiBasicAuthApi(), 'restApiBasicAuthApi'],
		[new RestApiHeaderAuthApi(), 'restApiHeaderAuthApi'],
		[new RestApiJwtAuthApi(), 'restApiJwtAuthApi'],
	])('provides the REST API icon for %s', (credential, name) => {
		expect(credential.name).toBe(name);
		expect(credential.icon).toEqual({
			light: 'file:../nodes/RestApi/rest-api.svg',
			dark: 'file:../nodes/RestApi/rest-api-dark.svg',
		});
	});
});
