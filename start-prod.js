const { spawn } = require('child_process');

// Función para matar procesos en el puerto 3000
function killPort(port) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // En Windows
      const findCmd = spawn('netstat', ['-ano', '-p', 'TCP']);
      let output = '';
      
      findCmd.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      findCmd.on('close', () => {
        const lines = output.split('\n');
        const pids = [];
        
        lines.forEach(line => {
          if (line.includes(`:${port}`) && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
              pids.push(pid);
            }
          }
        });
        
        if (pids.length > 0) {
          console.log(`🔪 Matando procesos en puerto ${port}: ${pids.join(', ')}`);
          pids.forEach(pid => {
            try {
              process.kill(pid, 'SIGTERM');
            } catch (e) {
              console.log(`No se pudo matar proceso ${pid}`);
            }
          });
        }
        
        setTimeout(resolve, 1000);
      });
    } else {
      // En Linux/Mac
      const killCmd = spawn('sh', ['-c', `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`]);
      
      killCmd.on('close', () => {
        console.log(`✅ Puerto ${port} liberado`);
        setTimeout(resolve, 1000);
      });
    }
  });
}

async function start() {
  const port = process.env.PORT || 3000;
  
  console.log('🔍 Verificando puerto...');
  await killPort(port);
  
  console.log('🚀 Iniciando aplicación...');
  const app = spawn('node', ['dist/main.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  app.on('error', (err) => {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  });
  
  app.on('exit', (code) => {
    console.log(`⚠️ Aplicación terminó con código ${code}`);
    process.exit(code);
  });
  
  // Manejar señales de terminación
  process.on('SIGTERM', () => {
    console.log('📴 Recibida señal SIGTERM, cerrando...');
    app.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('📴 Recibida señal SIGINT, cerrando...');
    app.kill('SIGINT');
  });
}

start().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
