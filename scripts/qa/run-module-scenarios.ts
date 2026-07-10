/**
 * Führt Modul-Szenarien dynamisch über ModuleScenarioRunner aus.
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const backendRoot = path.resolve(__dirname, '../../backend');
process.chdir(backendRoot);
dotenv.config({ path: path.join(backendRoot, '.env') });

async function main(): Promise<void> {
  const {
    moduleManager,
    moduleDiscovery,
    moduleRegistry,
    healthService,
    featureContext,
    tenantContext,
    tenantService,
  } = await import('../../backend/src/platform/bootstrap');
  const { QaRegistry, ModuleScenarioRunner, QaReportBuilder } = await import('../../backend/src/platform/qa');

  const defaultTenant = await tenantService.getDefaultTenant();
  const contextData = await tenantService.resolveContextData(defaultTenant);

  await tenantContext.runAsync(contextData, async () => {
    await moduleManager.initialize();

    const runner = new ModuleScenarioRunner(
      new QaRegistry(moduleDiscovery),
      moduleManager,
      moduleRegistry,
      healthService,
      featureContext
    );

    const results = await runner.runAll();
    const artifactsDir = path.resolve(__dirname, '../../artifacts');
    fs.mkdirSync(artifactsDir, { recursive: true });

    fs.writeFileSync(
      path.join(artifactsDir, 'module-scenarios.json'),
      JSON.stringify(results, null, 2)
    );

    const builder = new QaReportBuilder();
    const failed = results.filter((r) => !r.ok).length;
    builder.addSection({
      name: 'Modul-Szenarien',
      passed: results.length - failed,
      failed,
      skipped: 0,
      details: results,
    });
    const report = builder.build('module-scenarios');
    report.moduleScenarios = results.map((r) => ({
      scenarioId: r.scenarioId,
      ok: r.ok,
      label: r.label,
    }));
    fs.writeFileSync(path.join(artifactsDir, 'qa-summary.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(artifactsDir, 'qa-summary.md'), builder.toMarkdown(report));

    console.log(builder.toMarkdown(report));

    if (failed > 0) {
      process.exit(1);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
