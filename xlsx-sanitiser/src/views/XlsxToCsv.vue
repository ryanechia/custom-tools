<template>
  <div class="p-4 max-w-xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">XLS Email Validator & Cleaner</h1>
    <input type="file" accept=".xlsx" @change="handleFileUpload" class="mb-4" />

<!--    <DonutProgress v-if="progress.show" :total-progress="progress.total" :progress-count="progress.processed"></DonutProgress>-->

    <div v-if="progress.total > 0" class="w-full bg-gray-300 rounded h-4 mt-4 overflow-hidden">
      <div
        class="bg-blue-500 h-4 transition-all duration-300"
        :style="{ width: progress.percentage + '%' }"
      ></div>
      <p class="text-center text-sm mt-1">{{ progress.processed }} / {{ progress.total }} processed</p>
    </div>
    <div v-if="summary" class="mt-4 border p-4 rounded shadow">
      <h2 class="text-xl font-semibold mb-2">Validation Summary</h2>
      <p><strong>Total Records:</strong> {{ summary.total }}</p>
      <p><strong>Valid Records:</strong> {{ summary.valid }}</p>
      <p><strong>Invalid Records:</strong> {{ summary.invalid }}</p>

      <button
        v-if="cleanedBlobUrl"
        @click="downloadCsv"
        class="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Download Cleaned CSV
      </button>
      <button
        v-if="progress.invalidCount > 0"
        @click="downloadInvalidCsv"
        class="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        style="margin-left: 1rem"
      >
        Download Invalid CSV
      </button>
    </div>
  </div>
</template>

<script setup>
import * as XLSX from 'xlsx';
import { nextTick, reactive, ref } from 'vue';
import dns from 'dns';
import net from 'net';
import validator from 'validator';
// import DonutProgress from '@/components/DonutProgress.vue';

const summary = ref(null);
const cleanedBlobUrl = ref(null);
const invalidBlobUrl = ref(null);
const progress = reactive({ total: 0, processed: 0, percentage: 0, show: false, invalidCount: 0 });
function sanitizeName(name) {
  return name.replace(/[,()]/g, '').trim();
}

function sanitizeEmail(email) {
  let cleanEmail = email.replace(/^mailto:/i, '').trim();
  // Remove anything after the last '.com'
  const lastComIndex = cleanEmail.toLowerCase().lastIndexOf('.com');
  if (lastComIndex !== -1) {
    cleanEmail = cleanEmail.substring(0, lastComIndex + 4);
  }
  return cleanEmail;
}

async function isEmailActive(email) {
  return new Promise((resolve) => {
    const domain = email.split('@')[1];
    if (!domain) return resolve(false);

    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses.length) return resolve(false);

      const mailServer = addresses.sort((a, b) => a.priority - b.priority)[0].exchange;
      let responseCounter = 0;
      const socket = net.createConnection(25, mailServer);
      socket.setEncoding('ascii');

      socket.on('data', (data) => {
        if (data.includes('220') && responseCounter === 0) {
          socket.write(`HELO example.com\r\n`);
        } else if (data.includes('250') && responseCounter === 0) {
          responseCounter++;
          socket.write(`MAIL FROM:<test@example.com>\r\n`);
        } else if (data.includes('250') && responseCounter === 1) {
          responseCounter++;
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else if (data.includes('250') && responseCounter === 2) {
          resolve(true);
          socket.end('QUIT\r\n');
        } else if (data.includes('550') || data.includes('500') || data.includes('501')) {
          resolve(false);
          socket.end();
        }
      });

      socket.on('error', () => resolve(false));
      socket.on('end', () => resolve(false));
    });
  });
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    progress.total = jsonData.length;
    progress.processed = 0;
    progress.percentage = 0;
    progress.show = true;
    await nextTick();


    const cleanedData = [];
    const invalidData = [];

    for (const row of jsonData) {
      const name = sanitizeName(row.Name || '');
      const email = sanitizeEmail(row.EmailAddress || '');
      const block = row['Block_Number__c'] ? row['Block_Number__c'].toString().trim() : '';
      const level = row['Level__c'] ? row['Level__c'].toString().trim() : '';
      const unit = row['Unit_Number__c'] ? row['Unit_Number__c'].toString().trim() : '';

      const formatValid =
        name &&
        validator.isEmail(email) &&
        validator.isAlphanumeric(block) &&
        validator.isNumeric(level) &&
        validator.isNumeric(unit);

      // const activeValid = formatValid ? await isEmailActive(email) : false;

      if (formatValid) {
        // if (formatValid && activeValid) {
        cleanedData.push({
          Name: name,
          EmailAddress: email,
          Block_Number__c: block,
          Level__c: level,
          Unit_Number__c: unit,
        });
      } else {
        progress.invalidCount++;
        invalidData.push({
          Name: name,
          EmailAddress: email,
          Block_Number__c: block,
          Level__c: level,
          Unit_Number__c: unit,
        });
      }

      progress.processed++;
      progress.percentage = Math.round((progress.processed / progress.total) * 100);
      await nextTick();
    }

    summary.value = {
      total: jsonData.length,
      valid: cleanedData.length,
      invalid: progress.invalidCount,
    };

    function generateCSV(data, sheetName) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const wbout = XLSX.write(wb, { bookType: 'csv', type: 'array' });

      const blob = new Blob([wbout], { type: 'text/csv' });
      return blob;
    }

    const blob = generateCSV(cleanedData, 'Cleaned');
    const invalidBlob = generateCSV(invalidData, 'Invalid');
    cleanedBlobUrl.value = URL.createObjectURL(blob);
    invalidBlobUrl.value = URL.createObjectURL(invalidBlob);
  };

  reader.readAsArrayBuffer(file);
}

function downloadCsv() {
  const a = document.createElement('a');
  a.href = cleanedBlobUrl.value;
  a.download = 'cleaned_output.csv';
  a.click();
}

function downloadInvalidCsv() {
  const a = document.createElement('a');
  a.href = invalidBlobUrl.value;
  a.download = 'invalid_output.csv';
  a.click();
}
</script>

<style scoped>
body {
  font-family: Arial, sans-serif;
}
</style>
