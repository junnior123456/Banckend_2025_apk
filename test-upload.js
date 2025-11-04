const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

async function testUpload() {
  try {
    console.log('🧪 Testing upload endpoint...');
    
    // Crear un archivo de prueba simple
    const testContent = 'This is a test file for upload';
    fs.writeFileSync('test-image.txt', testContent);
    
    // Crear FormData
    const form = new FormData();
    form.append('image', fs.createReadStream('test-image.txt'));
    
    // Hacer la petición usando http nativo
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/upload/image?folder=test',
      method: 'POST',
      headers: form.getHeaders()
    };
    
    const req = http.request(options, (res) => {
      console.log('📤 Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📤 Response body:', data);
        // Limpiar archivo de prueba
        fs.unlinkSync('test-image.txt');
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error:', error);
      fs.unlinkSync('test-image.txt');
    });
    
    form.pipe(req);
    
  } catch (error) {
    console.error('❌ Error testing upload:', error);
  }
}

testUpload();