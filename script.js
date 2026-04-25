
let map, userLocation, chart, currentUser = null;
let users = JSON.parse(localStorage.getItem('solarcalc_users')) || {};
let customerData = {};
let allLeads = JSON.parse(localStorage.getItem('solarcalc_leads')) || [];

// UP Solar Companies Database
const UP_SOLAR_COMPANIES = [
    { name: "Tata Power Solar", phone: "1800-209-9292", rating: "4.6", services: "Residential, Commercial, PM Surya Ghar" },
    { name: "Loom Solar", phone: "011-6902-8899", rating: "4.5", services: "Rooftop Solar, Panels, Inverters" },
    { name: "UPNEDA Empanelled - Adani Solar", phone: "1800-102-4448", rating: "4.4", services: "Govt Scheme, Subsidy Help" },
    { name: "Jakson Group", phone: "0120-451-8000", rating: "4.3", services: "EPC, Solar Parks, Rooftop" },
    { name: "Vikram Solar", phone: "033-4025-0500", rating: "4.5", services: "Modules, EPC, O&M" },
    { name: "Waaree Energies", phone: "1800-212-0075", rating: "4.4", services: "Panels, Rooftop, Subsidy" }
];

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    handleAuth();
});

// ===== AUTHENTICATION =====
function handleAuth() {
    const savedUser = localStorage.getItem('solarcalc_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    }
}

document.getElementById('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    users[email] = { password, created: new Date().toISOString() };
    localStorage.setItem('solarcalc_users', JSON.stringify(users));

    currentUser = { email };
    localStorage.setItem('solarcalc_current_user', JSON.stringify(currentUser));
    showMainApp();
});

function switchToLogin() {
    document.getElementById('loginFormContainer').innerHTML = `
        <form id="loginForm">
            <h3>Login to Your Account</h3>
            <input type="email" id="loginEmail" placeholder="Email" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        <p>Don't have account? <a href="#" onclick="switchToSignup()">Sign Up</a></p>
    `;

    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (users[email] && users[email].password === password) {
            currentUser = { email };
            localStorage.setItem('solarcalc_current_user', JSON.stringify(currentUser));
            showMainApp();
        } else {
            alert('Invalid credentials!');
        }
    });
}

function switchToSignup() {
    document.getElementById('loginFormContainer').innerHTML = `
        <form id="signupForm">
            <h3>Create Account</h3>
            <input type="email" id="signupEmail" placeholder="Email" required>
            <input type="password" id="signupPassword" placeholder="Password" required>
            <button type="submit">Sign Up</button>
        </form>
        <p>Already have account? <a href="#" onclick="switchToLogin()">Login</a></p>
    `;

    document.getElementById('signupForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        if (users[email]) {
            alert('User already exists!');
            return;
        }

        users[email] = { password, created: new Date().toISOString() };
        localStorage.setItem('solarcalc_users', JSON.stringify(users));

        currentUser = { email };
        localStorage.setItem('solarcalc_current_user', JSON.stringify(currentUser));
        showMainApp();
    });
}

function showMainApp() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('mainApp').classList.remove('hidden');
}

function closeLogin() {
    if (!currentUser) {
        alert('Please login or signup first!');
    }
}

function logout() {
    localStorage.removeItem('solarcalc_current_user');
    currentUser = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginModal').classList.add('active');
}

// ===== LOCATION + MAP - FIXED PARSING FOR INDIA =====
function getCurrentLocation() {
    const stateInput = document.getElementById('state');
    const districtInput = document.getElementById('district');
    const cityInput = document.getElementById('city');
    const pincodeInput = document.getElementById('pincode');

    stateInput.value = "Detecting...";
    districtInput.value = "Detecting...";
    cityInput.value = "Detecting...";
    pincodeInput.value = "Detecting...";

    if (!navigator.geolocation) {
        alert("Geolocation not supported. Please enter manually.");
        stateInput.value = "Uttar Pradesh";
        districtInput.value = "Lucknow";
        cityInput.value = "Manual";
        pincodeInput.value = "226001";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (!map) {
                map = L.map('map').setView([lat, lng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);
            } else {
                map.setView([lat, lng], 13);
            }

            setTimeout(() => map.invalidateSize(), 200);

            if (userLocation) map.removeLayer(userLocation);
            userLocation = L.marker([lat, lng]).addTo(map).bindPopup('Your location').openPopup();

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
                const data = await res.json();
                const addr = data.address;

                stateInput.value = addr.state || "Uttar Pradesh";

                let district = addr.state_district || addr.county || addr.district || "";
                district = district.replace(/District$/i, '').trim();
                districtInput.value = district || "Lucknow";

                let city = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || addr.neighbourhood || "";
                if (city.toLowerCase() === district.toLowerCase()) {
                    city = addr.suburb || addr.hamlet || addr.village || addr.neighbourhood || city;
                }
                cityInput.value = city || "Detected";

                let pincode = addr.postcode || "";
                if (!/^\d{6}$/.test(pincode)) {
                    pincode = "226001";
                }
                pincodeInput.value = pincode;

            } catch (e) {
                console.error("Geocoding failed:", e);
                stateInput.value = "Uttar Pradesh";
                districtInput.value = "Lucknow";
                cityInput.value = "Detected";
                pincodeInput.value = "226001";
            }
        },
        (err) => {
            alert("Location permission denied. Please enable GPS or enter manually.");
            stateInput.value = "Uttar Pradesh";
            districtInput.value = "Lucknow";
            cityInput.value = "Manual Entry";
            pincodeInput.value = "226001";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ===== SOLAR CALCULATOR - WITH LEAD MANAGEMENT =====
document.getElementById('solarForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    const progressFill = document.getElementById('progressFill');
    if (loadingOverlay) loadingOverlay.classList.add('active');
    if (progressFill) progressFill.style.width = '30%';

    setTimeout(() => {
        if (progressFill) progressFill.style.width = '60%';
    }, 300);

    // VALIDATE CUSTOMER DETAILS FIRST
    const customerName = document.getElementById('customerName').value.trim();
    const customerMobile = document.getElementById('customerMobile').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();

    if (!customerName ||!customerMobile ||!customerAddress) {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        if (progressFill) progressFill.style.width = '0%';
        alert('Please fill all customer details above before calculating!');
        document.getElementById('customerDetails').scrollIntoView({ behavior: 'smooth' });
        if (!customerName) document.getElementById('customerName').focus();
        else if (!customerMobile) document.getElementById('customerMobile').focus();
        else document.getElementById('customerAddress').focus();
        return;
    }

    if (!/^[0-9]{10}$/.test(customerMobile)) {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        if (progressFill) progressFill.style.width = '0%';
        alert('Please enter a valid 10-digit mobile number!');
        document.getElementById('customerMobile').focus();
        return;
    }

    // Save customer data
    customerData = {
        name: customerName,
        mobile: customerMobile,
        address: customerAddress
    };

    // Now proceed with calculation
    const roofAreaSqM = parseFloat(document.getElementById('roofArea').value);
    const monthlyUnits = parseFloat(document.getElementById('monthlyUnits').value);
    const ratePerUnit = parseFloat(document.getElementById('ratePerUnit').value);
    const budget = parseFloat(document.getElementById('budget').value);

    // Constants for UP
    const GHI = 5.2;
    const LOSS = 0.80;
    const COST_PER_KW = 55000;
    const PANEL_AREA_PER_KW = 7;

    // 1. Size system
    const dailyUnits = monthlyUnits / 30;
    const requiredKW = dailyUnits / (GHI * LOSS);
    let systemKW = Math.max(Math.round(requiredKW * 10) / 10, 1);

    // 2. Roof constraint
    const maxKWByRoof = Math.floor(roofAreaSqM / PANEL_AREA_PER_KW);
    systemKW = Math.min(systemKW, maxKWByRoof);

    // 3. Budget constraint
    const maxKWByBudget = budget / COST_PER_KW;
    systemKW = Math.min(systemKW, maxKWByBudget);
    systemKW = Math.round(systemKW * 10) / 10;

    if (systemKW < 1) {
        if (loadingOverlay) loadingOverlay.classList.remove('active');
        if (progressFill) progressFill.style.width = '0%';
        alert('Roof area or budget too low for 1kW system. Min 7m² and ₹55,000 needed.');
        return;
    }

    // 4. UP SUBSIDY: 1kW=45k, 2kW=90k, 3kW+=1.08L
    let subsidyKW = Math.min(Math.ceil(systemKW), 3);
    let totalSubsidy = 0;
    let centralSubsidy = 0;
    let stateSubsidy = 0;

    if (subsidyKW === 1) {
        centralSubsidy = 30000;
        stateSubsidy = 15000;
        totalSubsidy = 45000;
    } else if (subsidyKW === 2) {
        centralSubsidy = 60000;
        stateSubsidy = 30000;
        totalSubsidy = 90000;
    } else if (subsidyKW >= 3) {
        centralSubsidy = 78000;
        stateSubsidy = 30000;
        totalSubsidy = 108000;
    }

    // 5. Financials
    const annualGeneration = systemKW * GHI * 365 * LOSS;
    const systemCost = systemKW * COST_PER_KW;
    const netCost = systemCost - totalSubsidy;
    const currentMonthlyBill = monthlyUnits * ratePerUnit;
    const monthlySavings = Math.min(annualGeneration / 12, monthlyUnits) * ratePerUnit;
    const yearlySavings = monthlySavings * 12;
    const roi = netCost > 0? ((yearlySavings / netCost) * 100) : 0;
    const paybackYears = netCost > 0 && yearlySavings > 0? (netCost / yearlySavings).toFixed(1) : 0;

    // 6. Update results
    document.getElementById('currentMonthlyBill').textContent = Math.round(currentMonthlyBill).toLocaleString();
    document.getElementById('monthlySavings').textContent = Math.round(monthlySavings).toLocaleString();
    document.getElementById('yearlySavings').textContent = Math.round(yearlySavings).toLocaleString();
    document.getElementById('roi').textContent = roi.toFixed(1) + '%';
    document.getElementById('kwNeeded').textContent = systemKW;
    document.getElementById('subsidy').textContent = totalSubsidy.toLocaleString();

    // Add payback card
    let resultsGrid = document.querySelector('.results-grid');
    if (!document.getElementById('paybackCard')) {
        const paybackCard = document.createElement('div');
        paybackCard.className = 'result-card';
        paybackCard.id = 'paybackCard';
        paybackCard.innerHTML = `
            <h3><span id="paybackYears">0</span> Years</h3>
            <p>Money Recovery Time</p>
        `;
        resultsGrid.appendChild(paybackCard);
    }
    document.getElementById('paybackYears').textContent = paybackYears;

    // SAVE LEAD DATA
    const leadData = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        customer: {
            name: customerData.name,
            mobile: customerData.mobile,
            address: customerData.address
        },
        location: {
            state: document.getElementById('state').value,
            district: document.getElementById('district').value,
            city: document.getElementById('city').value,
            pincode: document.getElementById('pincode').value
        },
        requirements: {
            roofArea: roofAreaSqM,
            monthlyUnits: monthlyUnits,
            ratePerUnit: ratePerUnit,
            budget: budget
        },
        calculation: {
            systemKW: systemKW,
            systemCost: systemCost,
            totalSubsidy: totalSubsidy,
            netCost: netCost,
            monthlySavings: Math.round(monthlySavings),
            yearlySavings: Math.round(yearlySavings),
            paybackYears: paybackYears,
            roi: roi.toFixed(1)
        }
    };

    allLeads.push(leadData);
    localStorage.setItem('solarcalc_leads', JSON.stringify(allLeads));

    displayUPCompanies();

    // COMPLETE LOADING ANIMATION
    setTimeout(() => {
        if (progressFill) progressFill.style.width = '100%';
        setTimeout(() => {
            if (loadingOverlay) loadingOverlay.classList.remove('active');
            if (progressFill) progressFill.style.width = '0%';

            document.getElementById('results').classList.remove('hidden');
            document.getElementById('chart').classList.remove('hidden');
            createChart(currentMonthlyBill, monthlySavings, yearlySavings);
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            showToast('Report generated successfully!');
        }, 500);
    }, 800);
});

// ===== DISPLAY COMPANIES - NO DUPLICATES =====
function displayUPCompanies() {
    document.getElementById('companiesSection')?.remove();

    const companiesSection = document.createElement('div');
    companiesSection.id = 'companiesSection';
    companiesSection.className = 'companies-section';

    let companiesHTML = `
        <h3 style="margin-top: 40px; margin-bottom: 20px; color: #ff6b00;">
            <i class="fas fa-solar-panel"></i> Top Solar Companies in Uttar Pradesh
        </h3>
        <div class="companies-grid">
    `;

    UP_SOLAR_COMPANIES.forEach(company => {
        companiesHTML += `
            <div class="company-card">
                <h4>${company.name}</h4>
                <p><i class="fas fa-star" style="color: #ffc107;"></i> ${company.rating}/5.0</p>
                <p><i class="fas fa-phone"></i> ${company.phone}</p>
                <p class="services">${company.services}</p>
            </div>
        `;
    });

    companiesHTML += `</div>`;
    companiesSection.innerHTML = companiesHTML;
    document.querySelector('#results').appendChild(companiesSection);
}

// ===== CHART =====
function createChart(currentBill, monthlySavings, yearlySavings) {
    const ctx = document.getElementById('savingsChart').getContext('2d');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Current Bill', 'Monthly Savings', 'Yearly Savings'],
            datasets: [{
                data: [currentBill, monthlySavings, yearlySavings],
                backgroundColor: ['#ff6b00', '#28a745', '#007bff']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ===== TOAST NOTIFICATION =====
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== WHATSAPP SEND =====
function sendWhatsAppReport() {
    if (!customerData.mobile) {
        alert('Please calculate first!');
        return;
    }

    const systemKW = document.getElementById('kwNeeded').textContent;
    const savings = document.getElementById('yearlySavings').textContent;
    const subsidy = document.getElementById('subsidy').textContent;

    const message = `Hi ${customerData.name}!%0A%0AYour Solar Report:%0A☀️ System: ${systemKW} kW%0A💰 Subsidy: Rs ${subsidy}%0A💵 Yearly Savings: Rs ${savings}%0A%0ABook free site visit: SOLAR-CALC%0ASector 14, Indira Nagar, Lucknow`;

    window.open(`https://wa.me/91${customerData.mobile}?text=${message}`, '_blank');
}

// ===== EXPORT LEADS CSV =====
function exportLeadsCSV() {
    if (allLeads.length === 0) {
        alert('No leads to export yet!');
        return;
    }

    let csv = 'Date,Name,Mobile,Address,City,District,System kW,Net Cost,Yearly Savings,Payback Years,ROI\n';
    allLeads.forEach(l => {
        csv += `${new Date(l.timestamp).toLocaleDateString()},${l.customer.name},${l.customer.mobile},"${l.customer.address}",${l.location.city},${l.location.district},${l.calculation.systemKW},${l.calculation.netCost},${l.calculation.yearlySavings},${l.calculation.paybackYears},${l.calculation.roi}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// ===== PDF GENERATION - WITH CUSTOMER + COMPANY ADDRESS =====
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const systemKW = parseFloat(document.getElementById('kwNeeded').textContent);
    const roofArea = document.getElementById('roofArea').value;
    const monthlyUnits = document.getElementById('monthlyUnits').value;
    const ratePerUnit = document.getElementById('ratePerUnit').value;

    let centralSubsidy = systemKW <= 1? 30000 : systemKW <= 2? 60000 : 78000;
    let stateSubsidy = systemKW <= 1? 15000 : 30000;
    const totalSubsidy = parseFloat(document.getElementById('subsidy').textContent.replace(/,/g, ''));

    const systemCost = systemKW * 55000;
    const netCost = systemCost - totalSubsidy;
    const currentBill = parseFloat(document.getElementById('currentMonthlyBill').textContent.replace(/,/g, ''));
    const monthlySave = parseFloat(document.getElementById('monthlySavings').textContent.replace(/,/g, ''));
    const yearlySave = parseFloat(document.getElementById('yearlySavings').textContent.replace(/,/g, ''));
    const roiValue = document.getElementById('roi').textContent;
    const paybackYears = document.getElementById('paybackYears')?.textContent || '0';

    const formatNum = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const orange = [255, 107, 0];
    const green = [19, 136, 8];

    doc.setFillColor(...orange);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLAR-CALC REPORT', 105, 15, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let yPos = 35;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orange);
    doc.text('Customer Details', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text(`Name: ${customerData.name || 'N/A'}`, 25, yPos);
    yPos += 7;
    doc.text(`Mobile: ${customerData.mobile || 'N/A'}`, 25, yPos);
    yPos += 7;

    const addressLines = doc.splitTextToSize(`Address: ${customerData.address || 'N/A'}`, 160);
    doc.text(addressLines, 25, yPos);
    yPos += addressLines.length * 7;

    doc.text(`Site Location: ${document.getElementById('city').value}, ${document.getElementById('district').value}`, 25, yPos);
    yPos += 7;
    doc.text(`PIN Code: ${document.getElementById('pincode').value}`, 25, yPos);
    yPos += 12;

    doc.setDrawColor(...orange);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orange);
    doc.text('System Recommendation', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const details = [
        [`Roof Area:`, `${roofArea} m²`],
        [`Monthly Units:`, `${monthlyUnits} kWh`],
        [`Rate per Unit:`, `Rs ${ratePerUnit}`],
        [`Recommended Capacity:`, `${systemKW} kW`],
        [`Annual Generation:`, `${formatNum(systemKW * 5.2 * 365 * 0.8)} units`]
    ];

    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 95, yPos);
        yPos += 7;
    });

    yPos += 5;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text('Subsidy Breakdown - PM Surya Ghar + UPNEDA', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const subsidies = [
        [`Central Subsidy (PM Surya Ghar):`, `Rs ${formatNum(centralSubsidy)}`],
        [`UP State Subsidy (UPNEDA):`, `Rs ${formatNum(stateSubsidy)}`],
        [`Total Subsidy:`, `Rs ${formatNum(totalSubsidy)}`]
    ];

    subsidies.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 95, yPos);
        yPos += 7;
    });

    yPos += 5;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orange);
    doc.text('Financial Summary', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const financials = [
        [`System Cost:`, `Rs ${formatNum(systemCost)}`],
        [`Less: Total Subsidy:`, `-Rs ${formatNum(totalSubsidy)}`],
        [`Your Net Cost:`, `Rs ${formatNum(netCost)}`],
        [`Current Monthly Bill:`, `Rs ${formatNum(currentBill)}`],
        [`Monthly Savings:`, `Rs ${formatNum(monthlySave)}`],
        [`Yearly Savings:`, `Rs ${formatNum(yearlySave)}`],
        [`ROI:`, `${roiValue}`],
        [`Payback Period:`, `${paybackYears} Years`]
    ];

    financials.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 25, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 95, yPos);
        yPos += 7;
    });

    yPos = 265;
    doc.setDrawColor(...orange);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orange);
    doc.text('SOLAR-CALC', 105, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Head Office: Sector 14, Indira Nagar, Lucknow, Uttar Pradesh 226016', 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text('Organization: Bharat Infotechs', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text('Christian Colony, Hazratganj, Lucknow, Uttar Pradesh', 105, yPos, { align: 'center' });
    yPos += 5;

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-IN')} | `, 105, yPos, { align: 'center' });

    doc.save(`solar-report-${customerData.name.replace(/\s+/g, '-')}.pdf`);
}

window.addEventListener('resize', () => {
    if (map) setTimeout(() => map.invalidateSize(), 200);
});

window.addEventListener('scroll', () => {
    const nav = document.querySelector('.sticky-nav');
    if (window.scrollY > 20) {
        nav.style.height = "70px";
        nav.style.background = "rgba(15, 15, 60, 0.95)"; /* Becomes deeper on scroll */
        nav.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    } else {
        nav.style.height = "80px";
        nav.style.background = "rgba(20, 20, 70, 0.85)";
        nav.style.boxShadow = "none";
    }
});




    // PASTE ALL YOUR EXISTING script.js CODE HERE
    
    // Then add the hamburger code at the bottom:
    
    // Mobile menu toggle
   document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
            document.body.classList.toggle('menu-open'); // Locks scroll
        });
        
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
    }
});
    
