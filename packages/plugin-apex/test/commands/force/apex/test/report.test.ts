/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { JUnitReporter, TapReporter, TestService } from '@salesforce/apex-node';
import { expect, test } from '@salesforce/command/lib/test';
import { Messages, SfdxProject } from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import {
  testRunSimple,
  cliJsonResult,
  cliWithCoverage,
  runWithCoverage,
  jsonWithCoverage,
  jsonResult
} from './testData';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-apex', 'report');

const SFDX_PROJECT_PATH = 'test-sfdx-project';
const TEST_USERNAME = 'test@example.com';
const projectPath = path.resolve(SFDX_PROJECT_PATH);
const sfdxProjectJson = {
  packageDirectories: [{ path: 'force-app', default: true }],
  namespace: '',
  sfdcLoginUrl: 'https://login.salesforce.com',
  sourceApiVersion: '49.0'
};

describe('force:apex:test:report', () => {
  let sandboxStub: SinonSandbox;

  beforeEach(async () => {
    sandboxStub = createSandbox();
    sandboxStub.stub(SfdxProject, 'resolve').returns(
      Promise.resolve(({
        getPath: () => projectPath,
        resolveProjectConfig: () => sfdxProjectJson
      } as unknown) as SfdxProject)
    );
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stdout()
    .command(['force:apex:test:report', '-i', '01pxx00000NWwb3'])
    .it(
      'should return a success human format message when no result format is specified',
      ctx => {
        const result = ctx.stdout;
        expect(result).to.not.be.empty;
        expect(result).to.contain('Test Summary');
        expect(result).to.contain('Test Results');
        expect(result).to.not.contain('Apex Code Coverage by Class');
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stdout()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'tap'
    ])
    .it(
      'should return result in tap format with tap resultformat specified',
      ctx => {
        const result = ctx.stdout;
        expect(result).to.not.be.empty;
        expect(result).to.contain('1..1');
        expect(result).to.contain('ok 1 MyApexTests.testConfig');
        expect(result).to.contain('# Run "sfdx force:apex:test:report');
        expect(result).to.not.contain('Apex Code Coverage by Class');
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stub(TapReporter.prototype, 'format', () => {
      throw new Error('Error with TAP');
    })
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'tap'
    ])
    .it('should handle a tap format parsing error', ctx => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal(jsonResult);
      expect(ctx.stderr).to.contain(
        messages.getMessage('testResultProcessErr', ['Error: Error with TAP'])
      );
    });

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stdout()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'junit'
    ])
    .it(
      'should return result in JUnit format with JUnit resultformat specified',
      ctx => {
        const result = ctx.stdout;
        expect(result).to.not.be.empty;
        expect(result).to.contain(
          '<testcase name="testConfig" classname="MyApexTests" time="0.05">'
        );
        expect(result).to.contain(`<property name="testsRan" value="1"/>`);
        expect(result).to.not.contain('# Run "sfdx force:apex:test:report');
        expect(result).to.not.contain('Apex Code Coverage by Class');
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stub(JUnitReporter.prototype, 'format', () => {
      throw new Error('Error with JUnit');
    })
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'junit'
    ])
    .it('should handle a junit format parsing error', ctx => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal(jsonResult);
      expect(ctx.stderr).to.contain(
        messages.getMessage('testResultProcessErr', ['Error: Error with JUnit'])
      );
    });

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stdout()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'human'
    ])
    .it(
      'should return result in human format with human resultformat specified',
      ctx => {
        const result = ctx.stdout;
        expect(result).to.not.be.empty;
        expect(result).to.contain('Test Summary');
        expect(result).to.contain('Test Results');
        expect(result).to.not.contain('Apex Code Coverage by Class');
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => ({ tests: [] }))
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--resultformat',
      'human'
    ])
    .it('should handle a human format parsing error', ctx => {
      expect(ctx.stdout).to.contain('{\n  "tests": []\n}\n');
      expect(ctx.stderr).to.contain(
        messages.getMessage('testResultProcessErr', [''])
      );
    });

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stdout()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--json',
      '--resultformat',
      'junit'
    ])
    .it(
      'should return result in json format with json resultformat specified',
      ctx => {
        const result = ctx.stdout;
        expect(result).to.not.be.empty;
        const resultJSON = JSON.parse(result);
        expect(resultJSON).to.deep.equal(cliJsonResult);
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => runWithCoverage)
    .stdout()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '--json',
      '--resultformat',
      'junit',
      '-c'
    ])
    .it('should return result in json format with code coverage', ctx => {
      const result = ctx.stdout;
      expect(result).to.not.be.empty;
      const resultJSON = JSON.parse(result);
      expect(resultJSON).to.deep.equal(cliWithCoverage);
    });

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => testRunSimple)
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'mkdirSync', () => true)
    .stub(fs, 'createWriteStream', () => new stream.PassThrough())
    .stub(fs, 'openSync', () => 10)
    .stub(fs, 'closeSync', () => true)
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '01pxx00000NWwb3',
      '-d',
      'path/to/dir',
      '--resultformat',
      'human'
    ])
    .it(
      'should output correct message when output directory is specified with human result format',
      ctx => {
        expect(ctx.stdout).to.contain(
          messages.getMessage('outputDirHint', ['path/to/dir'])
        );
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => runWithCoverage)
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'mkdirSync', () => true)
    .stub(fs, 'openSync', () => 10)
    .stub(fs, 'closeSync', () => true)
    .stub(fs, 'createWriteStream', () => new stream.PassThrough())
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '707xx0000AUS2gH',
      '-d',
      'path/to/dir',
      '--resultformat',
      'human',
      '-c'
    ])
    .it(
      'should display detailed coverage table when code coverage is specified with human resultformat',
      ctx => {
        expect(ctx.stdout).to.contain(
          'Apex Code Coverage for Test Run 707xx0000AUS2gH'
        );
      }
    );

  test
    .withOrg({ username: TEST_USERNAME }, true)
    .loadConfig({
      root: __dirname
    })
    .stub(process, 'cwd', () => projectPath)
    .stub(TestService.prototype, 'reportAsyncResults', () => runWithCoverage)
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'mkdirSync', () => true)
    .stub(fs, 'createWriteStream', () => new stream.PassThrough())
    .stub(fs, 'openSync', () => 10)
    .stub(fs, 'closeSync', () => true)
    .do(ctx => {
      ctx.myStub = sandboxStub.stub(TestService.prototype, 'writeResultFiles');
    })
    .stdout()
    .stderr()
    .command([
      'force:apex:test:report',
      '-i',
      '707xx0000AUS2gH',
      '-d',
      'path/to/dir',
      '--resultformat',
      'json',
      '-c'
    ])
    .it(
      'should create test-run-codecoverage file with correct content when code cov is specified',
      ctx => {
        expect((ctx.myStub as SinonStub).args).to.deep.equal([
          [
            runWithCoverage,
            {
              dirPath: 'path/to/dir',
              fileInfos: [
                {
                  filename: `test-result-${jsonWithCoverage.summary.testRunId}.json`,
                  content: jsonWithCoverage
                },
                {
                  filename: `test-result-codecoverage.json`,
                  content: jsonWithCoverage.coverage.coverage
                }
              ]
            },
            true
          ]
        ]);
      }
    );
});