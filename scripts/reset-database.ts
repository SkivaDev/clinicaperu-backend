#!/usr/bin/env ts-node
/**
 * Script de reset de base de datos para producción
 * 
 * ⚠️ ADVERTENCIA: Este script BORRARÁ TODOS LOS DATOS
 * 
 * Uso seguro:
 * 1. Requiere confirmación explícita
 * 2. Solo funciona si NODE_ENV !== 'production' O si se pasa flag --force
 * 3. Ejecuta las migraciones y el seed en orden
 * 
 * Comandos:
 * - Desarrollo: npx ts-node scripts/reset-database.ts
 * - Railway (staging): railway run npx ts-node scripts/reset-database.ts --force
 * - Producción: NO RECOMENDADO (usar migraciones incrementales)
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const args = process.argv.slice(2);
const forceFlag = args.includes('--force');
const isProduction = process.env.NODE_ENV === 'production';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  log('\n🔄 DATABASE RESET SCRIPT\n', 'blue');

  // Protección para producción
  if (isProduction && !forceFlag) {
    log('❌ ERROR: Este script está bloqueado en producción.', 'red');
    log('Si realmente necesitas resetear la base de datos en producción:', 'yellow');
    log('  railway run npx ts-node scripts/reset-database.ts --force\n', 'yellow');
    process.exit(1);
  }

  // Advertencia
  log('⚠️  ADVERTENCIA: Este script hará lo siguiente:', 'yellow');
  log('   1. Eliminar TODOS los datos de la base de datos', 'yellow');
  log('   2. Ejecutar todas las migraciones desde cero', 'yellow');
  log('   3. Ejecutar el seed para poblar datos iniciales\n', 'yellow');

  // Pedir confirmación
  const confirmed = await askConfirmation(
    '¿Estás seguro de que quieres continuar? (yes/no): '
  );

  if (!confirmed) {
    log('\n❌ Operación cancelada por el usuario.\n', 'red');
    process.exit(0);
  }

  try {
    log('\n📦 Paso 1/3: Reseteando base de datos...', 'blue');
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
    });
    log('✅ Base de datos reseteada\n', 'green');

    log('📦 Paso 2/3: Aplicando migraciones...', 'blue');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
    });
    log('✅ Migraciones aplicadas\n', 'green');

    log('📦 Paso 3/3: Ejecutando seed...', 'blue');
    execSync('npx prisma db seed', {
      stdio: 'inherit',
    });
    log('✅ Seed completado\n', 'green');

    log('🎉 ¡Reset completado exitosamente!\n', 'green');
  } catch (error) {
    log('\n❌ Error durante el reset:', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
