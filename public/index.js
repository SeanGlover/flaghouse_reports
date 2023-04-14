import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js'; // 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js' firebase/app;
const firebaseConfig = {
  apiKey: "AIzaSyCxAomFX0E2EZl3aRsNuLY2BhebY2x3Rk0",
  authDomain: "sandbox-sean.firebaseapp.com",
  databaseURL: "https://sandbox-sean-default-rtdb.firebaseio.com",
  projectId: "sandbox-sean",
  storageBucket: "sandbox-sean.appspot.com",
  messagingSenderId: "873201858434",
  appId: "1:873201858434:web:deaa507a11823e4c41419b",
  measurementId: "G-TCLJKJZB8F"
};
const app = initializeApp(firebaseConfig);

// Add the Firebase products and methods that you want to use
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js'; // 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js' 'firebase-auth';

import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  where,
  documentId
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js' // https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js 'firebase/firestore';

import {
  getStorage,
  getDownloadURL,
  ref,
  uploadString,
  uploadBytesResumable
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';

// import data_json from './data.json' assert { type: 'json' };
// console.log(data);

const auth = getAuth(app);
const db = getFirestore(app);

// Document elements
const wrapperSignin = document.getElementById('wrapper-signin');
const sectionReports = document.getElementById('sectionReports');
const detailsTemplate = document.getElementById('detailsTemplate');
const signinBtn = document.getElementById('signin');
const signoutBtn = document.getElementById('signout');

// use these later to determine what level of access a viewer has
const signinUsr = document.getElementById('creds_id');
const signinPwd = document.getElementById('creds_pwd');

var currentUser = null;
var autoSignOutComplete = false;
let reportsListener = null;
var doOnce = false;

async function main() {

  $(document).ready(function() {
    // one-time items once after doc is ready
    // don't refresh the page when the login button is clicked
    $("#signinForm").submit(function(e) {
      e.preventDefault();
    });
    signinBtn.addEventListener("click", signinClicked);
    signoutBtn.addEventListener("click", signoutClicked);
    // signoutFirebase();
    autoSignOutComplete = true;

  });
  async function signinClicked() {

    resetSectionReports();
    const signin = await signInWithEmailAndPassword(auth, signinUsr.value, signinPwd.value)
    .then((userCredential) => {
      // ....... do something

    }).catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(`${errorCode}: ${errorMessage}`);
      // ....... do something
      
    });

  }
  onAuthStateChanged(auth, user => {

    var signedIn = user != null && user.uid != null;
    wrapperSignin.style.display = signedIn ? 'none' : 'block';
    sectionReports.style.display = signedIn ? 'block' : 'none';

    if(currentUser == user) {
      // no change -> either signed in or not ... do nothing

    }
    else {
      // changed, update currentUser and do something
      // only log to the console a change if it was done manually
      if(autoSignOutComplete) {
        if (signedIn) {
          console.log(`user ${user.uid} successfully signed in at ${new Date()}`);
          sectionUpload();

          initialReportsLoad();
          ///////// start realtime updates
          subscribeReportIteration();
    
        } else {
          console.log(`user ${currentUser.uid} successfully signed out at ${new Date()}`);
          wrapperSignin.style.display = 'block';
          unsubscribeReportIteration();

        }
      }
      currentUser = user;
    }
  });
  async function signoutClicked() {

    resetSectionReports()
    await signOut(auth).then(() => {
      signinBtn.innerHTML = 'Let me in!';
      autoSignOutComplete = true;

    }).catch(error => {
      console.log(`${error.code}: ${error.message}`);
    });

  }
  function resetSectionReports() {

    $(document).ready(function() {

      var detailsReports = document.getElementsByTagName('details');
      for (var i = 0, item; item = detailsReports[i]; i++) {
        if(item.style.display == 'block') {
          document.getElementById('sectionReports').removeChild(item);
        }
      }
      
    });

  }
  async function initialReportsLoad() {

    resetSectionReports();
    let accessByUser = {};
    const access = query(collection(db, 'users'));
    const accessSnapshot = await getDocs(access);
    accessSnapshot.forEach((doc) => {
      var docData = doc.data();
      for (const [key, value] of Object.entries(docData)) {
        accessByUser[key] = value.Access;
      }
    });

    var signedInUser_hasProfile = auth.currentUser.uid in accessByUser;
    if(signedInUser_hasProfile) {
      var userAccess = accessByUser[auth.currentUser.uid];

      const globalId = auth.currentUser.uid == 'A4fQrSN1OaNsTBP966dRGPM31ZX2';
      var navbar = document.querySelector('#variants-upload-files');
      if(globalId) {
        navbar.style.display = 'block';
        sectionReports.style.marginTop = '99px';
      }
      else {
        navbar.style.display = 'none';
        sectionReports.style.marginTop = '5px';
      }
      
      var accessToAll = userAccess.ReportIds.length == 0;
      var accessLvl = userAccess.Permission;
      if(accessLvl >= 1) {
        // 0 = none, 1 = read, 2 = write
        // now get a list of reports to which the user has access
        // either user has access to a partial list or a full list - none doesn't get here
        var reports = collection(db, 'reports');
        var q;
        if(accessToAll) {
          q = query(reports, orderBy('ContactInfo.Organisation', 'asc'));
        }
        else {
          //, orderBy('ContactInfo.Organisation', 'asc')
          q = query(reports, where(documentId(), 'in', userAccess.ReportIds), orderBy(documentId(), 'asc'));
        }
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          // ... except 1 test report visible to me alone
          var isTestDoc = doc.id == '8a5bd441ac3449828c0c';
          if(globalId | (accessToAll | userAccess.ReportIds.includes(doc.id)) & !isTestDoc) {
            // console.log(doc.id, " => ", doc.data());
            updateReportHTML(doc, false);
          }
        });
        // window.scrollTo(0, document.body.scrollHeight);
      }
    }
  }
  async function subscribeReportIteration() {

    resetSectionReports();
    const q = query(collection(db, 'reports'), orderBy('Document.Date', 'desc'));
    reportsListener = await onSnapshot(q, snaps => {
      snaps.forEach(doc => {
        // updateReportHTML(doc, false);
      });
      initialReportsLoad();
    });

  }
  async function unsubscribeReportIteration() {
    ///////// stop realtime updates
    if (reportsListener != null) {
      reportsListener();
      reportsListener = null;
    }
  }
  async function updateReportHTML(queryDoc, openReport) {

    if(document.getElementById(queryDoc.id) != null) return;

    var clone = detailsTemplate.cloneNode(true);
    var docData = queryDoc.data();
    var notes = docData.Notes;
    var job = docData.Job;
    var products = docData.Products;
    var contactInfo = docData.ContactInfo;
    var jobDoc = docData.Document;
    var contactAddress = contactInfo.Address;
    var businessName = contactInfo.Organisation;
    var summaryClone = clone.getElementsByTagName('summary')[0];
    const workers = ['Sean Glover', 'John Bird', 'Joel Krikorian', 'Rick Enright', 'Roberto'];

    businessName = businessName.replace(/\s{2,}/g, ' ').trim();
    summaryClone.innerHTML = businessName;
    clone.id = queryDoc.id;

    var submitBtn = clone.querySelector("#submitForm");
    submitBtn.style = 'background-color: #55acee; padding: 10px 30px 10px 30px;';
    submitBtn.addEventListener('click', function() {

      var signedBy = clone.querySelector('#clientSignature');
      if(signedBy.value != null && signedBy.value.length > 0) {
        var feedback = {
          "ClientResponse": getClientResponse(clone)
        };
        // updating the database so turn off so page won't reset
        unsubscribeReportIteration();
        const destDoc = doc(db, 'reports', queryDoc.id);
        setDoc(destDoc, feedback, { merge:true })
        .then(lambda => {
            console.log(`Document updated successfully`);
            submitBtn.style = 'background-color: #32CD32; padding: 10px 30px 10px 30px;';
        })
        .catch(error => {
            console.log(error);
            submitBtn.style = 'background-color: red; padding: 10px 30px 10px 30px;'
        })

        clone.querySelector('#mainForm').style.display = 'none';
        clone.querySelector('#submittedMessage').style.display = 'block';

        // updated the database so turn back on so page will reset
        // subscribeReportIteration();
      }

    });

    // English[1]|Français[2]|Español[3]|Italiano[4]|Deutsch[5]
    var efs = isNaN(jobDoc.Language) ? getLanguage(jobDoc.Language) : jobDoc.Language;
    setLanguage(efs);

    clone.querySelectorAll('.row-language').forEach((row)=>{

      row.addEventListener('click', function(e) {

        var rowClicked = e.target;
        var dropdown = rowClicked.closest('.dropdown');
        var dropBtn = dropdown.children[0];
        var efsClicked = getLanguage(rowClicked.innerText);
        var selectedP = dropBtn.children[1];
        selectedP.innerText = rowClicked.innerText;
        setLanguage(efsClicked);

      })
    })

    if(!doOnce) {

      doOnce = true;
      document.querySelector('#reportsTitle').innerText = efs == 1 ? 'Reports' : efs == 2 ? 'Rapports' : 'Reportes';
      document.querySelector('#signout').innerText = efs == 1 ? 'Sign out' : efs == 2 ? 'Fermer session' : 'Cerrar sesión';
      
      document.querySelector('#div_updateJSON').addEventListener('click', function() {
        var openDetails = getOpenDetails();
        var dateOptions = {
            timeZone: 'America/Montreal',
            timeZoneName:'longOffset',
            hourCycle: 'h23',
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          fractionalSecondDigits: 3
        }
        openDetails.forEach(async (openDetail) => {

          var docName = openDetail.querySelector("#businessName").value;
          var docLanguage = openDetail.querySelector("#languagePref").innerText;
          docLanguage = isNaN(docLanguage) ? docLanguage : getLanguage(docLanguage); // ensure goes as an int
          console.log(`language index = ${efs} --> ${docLanguage} (${businessName} )`);

          const emptyReport = {
            "Document": {
              "Date": localDate(openDetail.querySelector("#documentDate")),
              "Language": getLanguage(docLanguage)
            },
            "Job": {
              "Type": openDetail.querySelector("#jobTypes").selectedIndex,
              "OrderNbr": openDetail.querySelector('#purchaseOrder').value,
              "Start": localDate(openDetail.querySelector("#startDate")),
              "End": localDate(openDetail.querySelector("#endDate")),
              "Completed": openDetail.querySelector("#checkComplete").checked,
              "SiteAssociate": workers[openDetail.querySelector("#installers").selectedIndex - 1]
            },
            "ContactInfo": {
              "Organisation": docName,
              "Name": openDetail.querySelector("#contactName").value,
              "Title": openDetail.querySelector("#contactTitle").value,
              "Email": openDetail.querySelector("#contactEmail").value,
              "Phone": openDetail.querySelector("#contactPhone").value,
              "Website": "",
              "Address": {
                "Street": openDetail.querySelector("#addressStreet").value,
                "City": openDetail.querySelector("#addressCity").value,
                "Province": openDetail.querySelector("#provinces").selectedIndex - 1,
                "Country": "Canada",
                "Code": openDetail.querySelector("#addressPostalCode").value
              }
            },
            "Products": [
              {
                "Source": 0,
                "Code": "",
                "Description": "",
                "Quantity": 0.0,
                "Serials": [],
                "Trained": false
              },
              {
                "Source": 0,
                "Code": "",
                "Description": "",
                "Quantity": 0.0,
                "Serials": [],
                "Trained": false
              }
            ],
            "TrainedStaff": [
              ""
            ],
            "Notes": {
              "Comments": openDetail.querySelector("#comments").value,
              "Issues": openDetail.querySelector("#issues").value,
            },
            "ClientResponse": getClientResponse(openDetail)
          }
          // downloadJSON(emptyReport, docName);
          const destDoc = doc(db, 'reports', openDetail.id);
          await setDoc(destDoc, emptyReport, { merge:false })
          .then(lambda => {
          })
          .catch(error => {
            console.log(error);
          })
          location.reload();
          openDetail.open = true;
        })
      })
    }

    function setLanguage(efs) {

      var flagIndex = 1;
      var flagStyle = 1;
      clone.querySelectorAll('.row-language').forEach((row)=>{
        var rowImg = row.children[0].children[0];
        rowImg.setAttribute('src', getFlagURL(flagIndex++, flagStyle))
      });

      // console.log(`language index = ${efs} --> ${getLanguage(efs)} (${businessName} )`);

      clone.querySelector("#languageIcon").setAttribute('src', getFlagURL(efs, flagStyle));
      clone.querySelector("#languageLabel").innerText = efs == 1 ? 'Document language' : efs == 2 ? 'Langue du document' : 'Idioma del documento';
      clone.querySelector("#languagePref").innerText = getLanguage(efs);
      clone.querySelector('#businessNameLabel').innerText = efs == 1 ? 'Business name' : efs == 2 ? 'Compagnie' : 'Empresa';
      clone.querySelector('#purchaseOrderLabel').innerText = efs == 1 ? 'Purchase order' : efs == 2 ? 'Bon de commande' : 'Orden de compra';
      clone.querySelector('#documentDateLabel').innerText = efs == 1 ? 'Document date' : efs == 2 ? 'Date de création du document' : 'Fecha del documento';
      clone.querySelector('#addressStreetLabel').innerText = efs == 1 ? 'Street' : efs == 2 ? 'Rue' : 'Calle';
      clone.querySelector('#addressProvinceLabel').innerText = efs == 3 ? 'Estado' :'Province';
      clone.querySelector('#addressCityLabel').innerText = efs == 1 ? 'City' : efs == 2 ? 'Ville' : 'Ciudad';
      clone.querySelector('#addressPostalCodeLabel').innerText = efs == 1 ? 'Postal code' : efs == 2 ? 'Code postale' : 'Código postal';
      clone.querySelector('#contactNameLabel').innerText = efs == 1 ? 'Contact name' : efs == 2 ? 'Nom du contact' : 'Contacto';
      clone.querySelector('#contactTitleLabel').innerText = efs == 1 ? 'Contact title' : efs == 2 ? 'Titre' : 'Título';
      clone.querySelector("#contactTitle").value = contactInfo.Title ?? (efs == 1 ? 'Program and services coordinator' : efs == 2 ? 'Coordonnateur/rice des programmes et services' : 'Coordinador(a) de programas y servicios');
      clone.querySelector('#contactEmailLabel').innerText = efs == 1 ? 'Contact email' : efs == 2 ? 'Courriel' : 'Correo';
      var jobTypeOptions = clone.querySelector('#jobTypes');
      if(efs == 1) {
        jobTypeOptions.innerHTML = '<option selected="" disabled="">Types</option><option value="I" id="type_install">Installation</option><option value="W" id="type_warranty">Warranty</option><option value="S" id="type_service">Service</option>';
      }
      else if(efs == 2) {
        jobTypeOptions.innerHTML = '<option selected="" disabled="">Types</option><option value="I" id="type_install">Installation</option><option value="W" id="type_warranty" selected="&quot;&quot;">Garantie</option><option value="S" id="type_service">Service</option>';
      }
      else if(efs == 3) {
        jobTypeOptions.innerHTML = '<option selected="" disabled="">Types</option><option value="I" id="type_install">Instalación</option><option value="W" id="type_warranty" selected="&quot;&quot;">Garantía</option><option value="S" id="type_service">Servicio</option>';
      }
      optionSet(jobTypeOptions, job.Type);

      clone.querySelector('#jobTypesLabel').innerText = efs == 1 ? 'Call type' : efs == 2 ? 'Type' : 'Tipo';
      clone.querySelector("#contactPhoneLabel").innerText = efs == 1 ? 'Contact phone' : efs == 2 ? 'N°. de téléphone' : 'Número de teléfono';
      clone.querySelector('#checkCompleteLabel').value = efs == 1 ? 'Completed' : efs == 2 ? 'Completé' : 'completo';
      clone.querySelector('#startDateLabel').innerText = efs == 1 ? 'Start' : efs == 2 ? 'Début' : 'Empezo';
      clone.querySelector('#endDateLabel').innerText = efs == 1 ? 'End' : efs == 2 ? 'Fin' : 'Fin';
      clone.querySelector('#serialsLabel').value = efs == 1 ? 'Serialized products' : efs == 2 ? 'Produits sérialisés' : 'Productos serializados';
      var serialFileSelector = clone.querySelector('#serials-choose');
      serialFileSelector.addEventListener('change', async function() {

        var csvFile = serialFileSelector.files[0];
        if(csvFile == null) return;
        var fileType = fileNameType(csvFile);
        if(fileType[1] == 'csv') {
          var csvTable = await csvFileTable(csvFile);
          delay(1);
          var rowNumbers = Object.keys(csvTable);
          // first create a dictionary by code
          var codes = {};
          for(var rw = 1; rw < rowNumbers.length; rw++) {
            var row = csvTable[rw];
            var code = (row["code"] ?? "").trim();
            if(!(code in codes)) { codes[code] = []; }
            codes[code].push(row);
          }

          const csvProducts = [];
          for (const [code, rows] of Object.entries(codes)) {
            var qty = 0;
            var desc = "";
            var serials = [];
            var trained = false;
            rows.forEach(row => {
              Array.from((row["serials"] ?? '').toString().split(',')).forEach(serial => {
                if(serial.trim() != '') {
                  serials.push(serial.trim());
                }
              });
              var rowQty = parseInt(row["qty"] ?? "0");
              if(!isNaN(rowQty)) {
                qty += parseInt(rowQty);
              }
              desc = row["description"] ?? "";
              trained = (row["trained"] ?? '').toLowerCase() == 'y';
            });
            var csvProduct = {
              "Source": 0,
              "Code": code,
              "Description": desc,
              "Quantity": serials.length > qty ? serials.length : qty,
              "Serials": serials,
              "Trained": trained
            };
            csvProducts.push(csvProduct);
          }
          // updating the database so turn off so page won't reset
          unsubscribeReportIteration();
          const destDoc = doc(db, 'reports', queryDoc.id);
          setDoc(destDoc, {"Products": csvProducts}, {merge:true})
          .then(lambda => {
              console.log(`Document updated successfully`);
          })
          .catch(error => {
              console.log(error);
          })
        }
        serialFileSelector.value = "";

      });
      clone.querySelector('#serials_csvUpload').addEventListener('click', function() {
        serialFileSelector.click();
      });
      clone.querySelector('#trainedProductsLabel').innerText = efs == 1 ? 'Trained products' : efs == 2 ? 'Produits formés' : 'Productos entrenados';
      clone.querySelector('#trainedStaffLabel').innerText = efs == 1 ? 'Trained staff' : efs == 2 ? 'Personnel formé' : 'Personal capacitado';
      clone.querySelector('#commentsLabel').innerText = (efs == 1 ? 'Comments' : efs == 2 ? 'Commentaires' : 'Commentarios') + ' (Flaghouse)';
      clone.querySelector('#issuesLabel').innerText = efs == 1 ? 'Issues' : efs == 2 ? 'Problèmes' : 'Problemas';
      clone.querySelector('#clientCommentsLabel').innerText = efs == 1 ? 'Client comments' : efs == 2 ? 'Commentaires (client)' : 'Commentarios (cliente)';
      clone.querySelector('#clientSignatureLabel').innerText = efs == 1 ? 'Client signature' : efs == 2 ? 'Signature du client' : 'Firma cliente';
      clone.querySelector('#clientSignature').placeholder = efs == 1 ? 'Type your name' : efs == 2 ? 'Écrivez votre nom' : 'Escribir su nombre';
      clone.querySelector('#signDateLabel').innerText = efs == 1 ? 'Dated' : efs == 2 ? 'Date' : 'Fechado';
      //Stars
      clone.querySelector('#starsOverall').innerText = efs == 1 ? 'Overall rating' : efs == 2 ? 'Évaluation globale' : 'Valoración general';
      clone.querySelector('#starsProfessional').innerText = efs == 1 ? 'Installer professional' : efs == 2 ? 'Professionnalisme de l’installateur' : 'X del instalador';
      clone.querySelector('#starsPrompt').innerText = efs == 1 ? 'Installer promptness' : efs == 2 ? "Promptitude d'installateur" : 'Prontitud del instalador';
      clone.querySelector('#starsWorkmanship').innerText = efs == 1 ? 'Installer workmanship' : efs == 2 ? 'Niveau de qualité du travail' : 'Mano de obra del instalador';
      clone.querySelector('#starsQuality').innerText = efs == 1 ? 'Product quality' : efs == 2 ? 'Qualité des produits' : 'Calidad de los productos';
      clone.querySelector('#starsOtherInput').placeholder = efs == 1 ? 'Optional input - type your criteria' : efs == 2 ? 'Saisie optionnelle - tapez vos critères' : 'Entrada opcional - escriba sus criterios';

      clone.querySelector('#agreeTermsLabel').innerText = efs == 1 ? 'Agree to terms and conditions' : efs == 2 ? 'Accepter termes et conditions' : 'Aceptar los términos y condiciones';
      clone.querySelector('#submitLabel').innerText = efs == 1 ? 'Submit' : efs == 2 ? 'Soumettre' : 'Enviar';

      //submission form
      clone.querySelector('#submittedThanks').innerText = efs == 1 ? "Thanks! Your response has been sent. We'll take it from here!" : efs == 2 ? 'Merci! Votre réponse a été envoyée. Nous allons prendre le relais!' : '¡Gracias! Su respuesta ha sido enviada. ¡Nos encargaremos desde aquí!';
      clone.querySelector('#submittedStatus').innerText = (efs == 1 ? 'Success' : efs == 2 ? 'Succès' : 'Exito') + '!';
      clone.querySelector('#submittedReload').innerText = efs == 1 ? "Return to original form" : efs == 2 ? 'Retour au formulaire original' : 'Volver al formulario original';
      clone.querySelector('#submittedRedirect').innerText = efs == 1 ? 'Redirect to official Flaghouse site' : efs == 2 ? 'Rediriger vers le site officiel de Flaghouse' : 'Redirigir al sitio oficial de Flaghouse';

    }
    function getFlagURL(efs, style) {

      style = style ?? 0;
      var png = '';
      if(style == 0) {
        png = efs == 1 ? 'United_Kingdom' : efs == 2 ? 'France' : efs == 3 ? 'Spain' : efs == 4 ? 'Italy' : efs == 5 ? 'Germany' : 'United_Kingdom';
        return `https://cdn2.iconfinder.com/data/icons/world-flag-icons/128/Flag_of_${png}.png`;
      }
      else if(style == 1) {
        png = efs == 1 ? 'EUA' : efs == 2 ? 'France' : efs == 3 ? 'Espanha' : efs == 4 ? 'Italia' : efs == 5 ? 'Alemanha' : 'EUA';
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_EUA.png
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_France.png
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_Espanha.png
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_Mexico.png
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_Italia.png
        // https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_Alemanha.png
        return `https://cdn4.iconfinder.com/data/icons/world-cup-2014-cogged-wheel-style/128/flat_world_cup_icon_512_${png}.png`;
      }

    }
    function getLanguage(indexOrName) {
      if(isNaN(indexOrName)) {
        return indexOrName == 'English' ? 1 : indexOrName == 'Français' ? 2 : indexOrName == 'Español' ? 3 : indexOrName == 'Italiano' ? 4 : indexOrName == 'Deutsch' ? 5 : 0;
      }
      else {
        return indexOrName == 1 ? 'English' : indexOrName == 2 ? 'Français' : indexOrName == 3 ? 'Español' : indexOrName == 4 ? 'Italiano' : indexOrName == 5 ? 'Deutsch' : 'English';
      }
    }

    clone.querySelector("#businessName").setAttribute("value", businessName);
    clone.querySelector("#purchaseOrder").setAttribute("value", job.OrderNbr);
    clone.querySelector("#documentDate").setAttribute("value", formatDate(new Date(jobDoc.Date.seconds * 1000)));
    clone.querySelector("#addressStreet").setAttribute("value", contactAddress.Street);
    clone.querySelector("#addressCity").setAttribute("value", contactAddress.City);
    clone.querySelector("#addressPostalCode").setAttribute("value", contactAddress.Code);
    optionSet(clone.querySelector("#installers"), workers.indexOf(job.SiteAssociate));
    
    // 0   1   2   3   4   5   6   7   8   9   10  11  12
    // AB, BC, MB, NB, NL, NT, NS, NU, ON, PE, QC, SK, YK
    optionSet(clone.querySelector('#provinces'), contactAddress.Province);
    clone.querySelector("#contactName").setAttribute("value", contactInfo.Name);
    clone.querySelector("#contactName").setAttribute("value", contactInfo.Name);
    clone.querySelector("#contactTitle").setAttribute("value", contactInfo.Title);
    clone.querySelector("#contactEmail").setAttribute("value", contactInfo.Email);
    clone.querySelector("#contactPhone").setAttribute("value", contactInfo.Phone);
    clone.querySelector("#checkComplete").checked = job.Completed;
    clone.querySelector("#startDate").setAttribute("value", formatDate(new Date(job.Start.seconds * 1000)));
    clone.querySelector("#endDate").setAttribute("value", formatDate(new Date(job.End.seconds * 1000)));
    
    clone.querySelector('#submittedReload').addEventListener('click', function() {
      location.reload();
    })

    var clientResponse = docData.ClientResponse;
    var submitWarning = clone.querySelector("#submitWarning");
    if(clientResponse == null) {

      summaryClone.style.borderLeft = '15px solid grey';
      submitWarning.style.display = 'none';

    }
    else {

      summaryClone.style = 'border-left: 15px solid darkgreen; background-color: green';

      clone.querySelector('#clientComments').innerText = clientResponse.Feedback.comments;
      clone.querySelector('#clientComments').style = "font-weight: bold;"
      clone.querySelector('#clientSignature').value = clientResponse.Submitter;
      clone.querySelector('#clientSignature').style = "font-weight: bold;"
      var signDate = clone.querySelector('#signDate');
      signDate.value = formatDate(new Date(clientResponse.Date.seconds * 1000));
      signDate.style = "font-weight: bold; color: green;";

      /// now for the stars
      const clientStars = clientResponse.Feedback.stars; // dictionary
      const catStars = clone.querySelectorAll('td[id^="stars"]:not([id$="Overall"])');
      const catNames = Array.from(catStars).map(function(s) {return s.id});
      const clientInput = Object.keys(clientStars).filter(value => !catNames.includes(value));
      if(clientInput.length > 0) {
        clone.querySelector('#starsOtherInput').value = clientInput[0];
      }
      Object.keys(clientStars).forEach(starKey => {
        var rating = clientStars[starKey];
        var starId = catNames.includes(starKey) ? starKey : 'starsClient';
        var starCat = clone.querySelector('#' + starId);
        var stars = starCat.closest('tr').querySelectorAll('img');
        // fill each star for whole ratings
        for (var s = 0; s < Math.floor(rating); s++) {
          var star = stars[s];
          star.setAttribute('src', 'images/starFill.png');
        }
        // is last star Half?
        if(rating - Math.floor(rating) > 0) {
          var lastStar = stars[Math.ceil(rating) - 1];
          lastStar.setAttribute('src', 'images/starHalf.png');
        }
        // console.log(`Category: ${starKey.replace('stars', '')}: ${rating}`);
      });

      // already submitted once warning... submit again / overwrite?
      submitWarning.style.display = 'block';
      var tmstmp = new Date(clientResponse.Date.seconds * 1000);
      var dateString = tmstmp.toLocaleString(efs == 1 ? 'en-US' : efs == 2 ? 'fr-FR' : 'es-MX', { month: 'long', day: 'numeric', year: 'numeric' });
      submitWarning.innerText = efs == 1 ? `Submitted ${dateString} ... overwrite?` : efs == 2 ? `Soumis le ${dateString} ... réécriture?` : `Enviado el ${dateString} ... sobrescribir?`;

    }

    clone.style = "display: block";
    sectionReports.appendChild(clone);
    clone.open = openReport; // show (or not) the section - if report.count == 1 --> open, otherwise user clicks to open

    // do this ONLY after visible... otherwise error!
    await delay(1);
    textareaSetText(clone, 'comments', notes.Comments);
    textareaSetText(clone, 'issues', notes.Issues);

    // get the products collection, which contains a list of ALL products in the job
    // ... in the serial section, show only products marked with a serial number
    var serializedProducts = products.filter(function (product) {
      return product.Serials.length > 0;
    });
    const nbrCols = 3;
    var rowNbr = 1;
    var colNbr = 1;
    for (var p = 0; p < serializedProducts.length; p++) {
      var product = serializedProducts[p];
      var rc = `r${rowNbr}c${colNbr}_serial`;
      colNbr++;
      if(colNbr == 4) {
        colNbr = 1; rowNbr++;
      }
      var productSerials = product.Serials.join(',');
      var serialText = '' + (product.Serials.length == 1 ? 'serial# ' + product.Serials[0] : `serials: [${productSerials}]`) + ''; // <strong> </strong>
      var cellText = `${product.Code} ${product.Description} ${serialText}`.trim();
      // console.log(`${businessName}, ${cellText}`);
      rxcySetCellText(clone, rc, cellText);
    };
    // ... in the trained section (products), show only products marked as Trained: true
    var trainedProducts = products.filter(function (product) {
      return product.Trained;
    });
    var rowNbr = 1;
    var colNbr = 1;
    for (var p = 0; p < trainedProducts.length; p++) {
      var product = trainedProducts[p];
      var rc = `r${rowNbr}c${colNbr}_trained`;
      colNbr++;
      if(colNbr == 4) {
        colNbr = 1; rowNbr++;
      }
      var cellText = `${product.Code} ${product.Description}`.trim();
      rxcySetCellText(clone, rc, cellText);
    };
    // ... the trained staff section is populated with a list from the docData.TrainedStaff
    rxcySetCellText(clone, 'r1c1_trainedStaff', docData.TrainedStaff.join(', '));

  }
  async function sectionUpload() {

    var filesChoose_delegate = document.querySelector('#div_files-choose');
    var filesChoose = document.querySelector('#files-choose');
    var filesUpload = document.querySelector('#div_files-upload');
    var label_filesChoose = document.querySelector('#label_files-choose');
    var label_filesUpload = document.querySelector('#label_files-upload');
    filesChoose_delegate.addEventListener('click', function (e) {

      // Get the target
      const target = e.target;
      // Get the bounding rectangle of target
      const rect = target.getBoundingClientRect();
      // Mouse position
      const x = e.clientX;
      const y = e.clientY;

      var trash = document.querySelector('#files-trash');
      if(trash == null) {
        filesChoose.click();
      }
      else {
        var trashRect = trash.getBoundingClientRect();
        if(x > trashRect.x & x < (trashRect.x + trashRect.width) & y > trashRect.y & y < (trashRect.y + trashRect.height)) {
          /// clicked on the trashcan!
          filesChoose.value = '';
          label_filesUpload.style = "color: black";
          label_filesChoose.innerHTML = '<i class="bi bi-folder-plus" style="font-size:24px;"></i>Choose file(s)';
        }
        else {
          filesChoose.click();
        }
      }

    });
    // the change event is fired when the file explorer returned selected file(s)
    filesChoose.addEventListener('change', async function() {

      document.querySelector('#row_files-message').style.display = 'none';
      document.querySelector('#label_files-message').innerHTML = '';

      // supported file types:
      // ---------------------
      // specific to a job --> [pdf, png, jpg, txt, csv]
      // global --> [json] ( add new report or update access configs )

      var acceptedTypes = ['pdf', 'png', 'jpg', 'txt', 'csv', 'json'];
      var acceptedFiles = [];
      var acceptedFileTypes = [];
      var rejectedFiles = [];
      for (var f = 0; f < filesChoose.files.length; f++) {
        var nameType = fileNameType(filesChoose.files[f].name);
        // var fileName = nameType[0];
        var fileType = nameType[1];
        var file_NameType = nameType.join('.');
        if(acceptedTypes.includes(fileType)) {
          acceptedFiles.push(file_NameType)
          acceptedFileTypes.push(fileType);
        }
        else {
          rejectedFiles.push(file_NameType);
        }
      }
      if(rejectedFiles.length > 0) {
        document.querySelector('#row_files-message').style.display = 'block';
        document.querySelector('#label_files-message').innerHTML = `The following files are not accepted: <mark>${rejectedFiles.join('*')}</mark>`;
      }
      if(acceptedFiles.length > 0) {

        var progressBarHTML = '<div class="progress" style="height: 20px; width: 200px; margin-left: 5px;"><div class="progress-bar bg-success" id="upload-progress" role="progressbar" style="width: 0%;" aria-valuemin="0" aria-valuemax="100">0%</div></div>'
        var acceptedString = acceptedFiles.join(' + ');
        label_filesChoose.innerHTML = `<i class="bi bi-trash" id="files-trash" style="font-size:24px;"></i>${acceptedString}`;
        document.getElementById('label_files-upload').innerHTML = '<i class="bi bi-cloud-check-fill" id="i_files-upload"></i>Upload' + progressBarHTML;
        console.log(`Selected files: ${acceptedString}`);
        document.querySelector('#files-trash').addEventListener('click', function() {
          label_filesUpload.innerHTML = '<i class="bi bi-cloud-arrow-up" style="font-size:24px; z-index: 1"></i>Upload' + progressBarHTML;
        })

      }

    });
    filesUpload.addEventListener('click', async function() {

      ////////// upload compressed photos of a completed room
      var uploadButton = document.getElementById('label_files-upload');
      var canUpload = uploadButton.innerHTML.includes('bi-cloud-check-fill');
      // console.log(canUpload ? 'ok to upload' : 'not ok to upload');
      if(canUpload) {

        var typesJob = ['pdf', 'png', 'jpg', 'txt', 'csv']; // specific to a job
        var typesGlobal = ['json']; // global config files
        var filesJob = [];
        var filesGlobal = [];

        for (var f = 0; f < filesChoose.files.length; f++) {
          var file = filesChoose.files[f];
          var nameType = fileNameType(file.name);
          if(typesJob.includes(nameType[1])) {
            filesJob.push(file);
          }
          else if(typesGlobal.includes(nameType[1])) {
            filesGlobal.push(file);
          }

          if(filesJob.length > 0) {

            // there are files that are specific to a job ... is a detail section open?
            var openDetails = getOpenDetails();
            if(openDetails.length == 1) {
              document.querySelector('#row_files-message').style.display = 'none';
              document.querySelector('#label_files-message').innerHTML = '';
              for(var f = 0; f < filesJob.length; f++) {
                var file = filesJob[f];
                await uploadFile(file, openDetails[0].id);
              }
            }
            else {
              document.querySelector('#row_files-message').style.display = 'block';
              document.querySelector('#label_files-message').innerHTML = 'You have selected files that are specific to a job, but no job section is opened. Open the ONE job section for which these files belong and click "Upload" again';
            }

          }
          if(filesGlobal.length > 0) {
            // these are global files - either a user config or a report document
            for(var f = 0; f < filesGlobal.length; f++) {
              var jsonFile = filesGlobal[f];
              await uploadFile(jsonFile, null);
            }
          }
        }
      }

    });
  }
  function getOpenDetails() {

    var details = [].slice.call(document.getElementsByTagName('details'));
    var openDetails = details.filter(d => d.hasAttribute("open"));
    return openDetails;

  }
  function downloadDummy() {

    // downloads image from website
    downloadWithProgress();

    // download JSON file from project example of data.json
    // but could be created on the fly and downloaded
    var jsonString = JSON.stringify(data_json);
    var json = JSON.parse(jsonString, JSON.dateParser);
    downloadJSON(json, 'dummyData');

  }
  function downloadWithProgress(siteAddress, filename) {
    
    // https://itnext.io/how-to-download-files-with-javascript-d5a69b749896
    const startTime = new Date().getTime();
    var request = new XMLHttpRequest();
  
    request.responseType = "blob";
    siteAddress = siteAddress ?? 'https://miro.medium.com/v2/resize:fit:828/format:webp/1*pwAtFjXh5sxCW8WtVXXcqw.png';
    request.open("get", siteAddress, true);
    request.send();
  
    request.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        const imageURL = window.URL.createObjectURL(this.response);
        const anchor = document.createElement("a");
        anchor.href = imageURL;
        filename = filename ?? 'monkeyLove.png';
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
      }
    };
    request.onprogress = function (e) {
      const percent_complete = Math.floor((e.loaded / e.total) * 100);
      const duration = (new Date().getTime() - startTime) / 1000;
      const bps = e.loaded / duration;
      const kbps = Math.floor(bps / 1024);
      const time = (e.total - e.loaded) / bps;
      console.log(percent_complete);
    }
  }
  function downloadJSON(exportObj, exportName) {

    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

  }
  function getClientResponse(rootElement) {

    var dict = {};      
    var rows = rootElement.querySelector("#starsByCategory").querySelectorAll("tr");
    for (var rw = 0; rw < rows.length; rw++) {
      var sumStars = 0;
      var row20 = rows[rw];
      var stars = row20.querySelectorAll("img");
      for (var str = 0; str < stars.length; str++) {
        var star = stars[str];
        var ehf = star.getAttribute('src').split('/')[1].split('.')[0].replace('star', '');
        var starValue = ehf == 'Fill' ? 1 : ehf == 'Half' ? .5 : 0;
        sumStars += starValue;
      }
      var catId = null;
      if(row20.querySelector('input') == null) {
        catId = row20.querySelector('td').id;
      }
      else {
        catId = row20.querySelector('input').value.trim();
        if(catId == '') { catId = 'starsClient'}
      }
      dict[catId] = sumStars;
    }
    const clientResponse = {
      "Submitter": rootElement.querySelector("#clientSignature").value,
      "Date": localDate(rootElement.querySelector("#signDate")),
      "Submited": true,
      "Feedback": {
        "stars": dict,
        "comments": rootElement.querySelector("#clientComments").value
      }
    };
    return clientResponse;

  }

  //#region JSON dateParse
  // https://weblog.west-wind.com/posts/2014/jan/06/javascript-json-date-parsing-and-real-dates
  const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
  const reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;
  JSON.dateParser = function (key, value) {
      if (typeof value === 'string') {
          var a = reISO.exec(value);
          if (a)
              return new Date(value);
          a = reMsAjax.exec(value);
          if (a) {
              var b = a[1].split(/[-+,.]/);
              return new Date(b[0] ? +b[0] : 0 - +b[1]);
          }
      }
      return value;
  };
  //#endregion

// misc functions
  function sort_by_key(array, key)
  {
  return array.sort(function(a, b)
  {
    var x = a[key]; var y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
  }
  function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
  }
  function addMinutes(date, minutes) {
    
    date.setMinutes(date.getMinutes() + minutes);
    return date;

  }
  function localDate(dateElement) {

    /// what a pain! getTimeOffset() MUST use the date in question as it changes with DST
    /// example: 02/28/2023 was +5 but 03/12/2023 was +4
    /// so setting a retro datetime must use the date offset of that date and not a current date
    var elementDate = new Date(dateElement.value);
    var montrealOffsetMinutes = elementDate.getTimezoneOffset();
    return addMinutes(elementDate, montrealOffsetMinutes);

  }
  function createGUID() {
    return('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
    }));
  }
  function delay(time) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), time);
    });
  }
  function textareaSetText(clonedReport, id, text) {

    var textarea = clonedReport.querySelector("#" + id);
    textarea.value = text.replaceAll('■', '\n');
    textarea.style.height = `${textarea.scrollHeight}px`;

  }
  function optionSet(options, selectedIndex) {

    options.selectedIndex = -1;
    if(selectedIndex < options.length) {
      options.selectedIndex = selectedIndex + 1;
    }

  }
  function rxcySetCellText(clonedReport, rxcy, text) {

    // var guidId = `${rxcy}_${createGUID()}`;
    var docCell = clonedReport.querySelector("#" + rxcy);
    if(docCell != null) {
      // docCell.setAttribute('id', guidId);
      docCell.value = text;
      docCell.innerText = text;
    }

  }
  function toBase64(file) {

    if(file == null) {
      return 'empty file!';
    }
    else {
      var reader = new FileReader();
      reader.onloadend = function() {
        return reader.result;
      }
      reader.readAsDataURL(file);
    }

  }
  function uploadBase64() {

      // Base64 formatted string
      const message2 = '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';
      uploadString(storageRef, message2, 'base64').then((snapshot) => {
        console.log('Uploaded a base64 string!');
      });
      // Data URL string
      const message4 = 'data:text/plain;base64,5b6p5Y+344GX44G+44GX44Gf77yB44GK44KB44Gn44Go44GG77yB';
      uploadString(storageRef, message4, 'data_url').then((snapshot) => {
        console.log('Uploaded a data_url string!');
      });

  }
  function readFileAsync(file) {

    // https://simon-schraeder.de/posts/filereader-async/
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
  
      reader.onload = () => {
        resolve(reader.result);
      }
      reader.onerror = reject;  
      //reader.readAsArrayBuffer(file);
      reader.readAsText(file);
    })

  }
  async function csvFileTable(csvFile) {

    Array.prototype.max = function() {
      return Math.max.apply(null, this);
    };
    Array.prototype.min = function() {
      return Math.min.apply(null, this);
    };
    /// row[0] --> headers as Dictionary<int, string>
    /// rows[1+} --> row data as Dictionary<string, string> {colName, cellValue}
    const table = {};
    const headers = {};
    // Papa.parse is awaitable
    await Papa.parse(csvFile, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {

        var rowIndex = 0;
        let rows = Array.from(results.data);
        let rowMax = [100, rows.length];
        
        for(rowIndex = 1; rowIndex <= rowMax.min(); rowIndex++) {

          var cells = {};
          var row = rows[rowIndex - 1];
          var rowHdrs = Array.from(Object.keys(row));
          for(var colIndex = 0; colIndex < rowHdrs.length; colIndex++) {
            var colName = rowHdrs[colIndex];
            cells[colName] = row[colName];
            if(rowIndex == 1) { headers[colIndex] = colName; }
          }
          table[rowIndex] = cells;
        }
        if(rowIndex != 0) { table[0] = headers }

      }
    });
    await delay(1);
    return table;

  }
  async function uploadFile(file, id) {

    // global upload - JSON files only [userAccess, newReport] --> firestore
    if(id == null) {
      try {
        var jsonString = await readFileAsync(file);
        var json = JSON.parse(jsonString, JSON.dateParser);
        
        // Report class has Document as a property
        if(json.Document != null) {
          // check if a report exists with the same document
          var reports = [];
          var q = query(collection(db, 'reports'), orderBy('Document.Date', 'desc'));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            reports[doc.data().ContactInfo.Organisation] = doc;
          });
          var organisation = json.ContactInfo.Organisation;
          var orgExists = organisation in reports;
          var orgKey = orgExists ? reports[organisation].id : createGUID().replace(/-/g, '').substring(0, 20);
          
          const response = await addReport(orgKey, json);
          console.log((response[0] ? 'Successfully ' + (orgExists ? 'replaced' : 'uploaded') : 'Failed to ' + (orgExists ? 'replace' : 'upload')) + ` ${organisation}`);

        }
        // UserCollection class has Users as a property
        else if(json.Users != null) {
          const response = await updateAccess(json);
          console.log((response[0] ? 'Successfully replaced' : 'Failed to replace') + 'config file');

        }
      }
      catch(error) {console.log(error);}

    }
    // file upload into storage under report key
    else {
      uploadTaskPromise(file, id);
    }
  }
  async function uploadTaskPromise(file, id) {

    var progressBar = document.querySelector('#upload-progress');
    progressBar.style.width = `${0}%`;
    progressBar.innerText = `${0}%`;
    return new Promise(function(resolve, reject) {

      // job specific upload - supporting files [pdf, png, jpg] --> storage
      var filepath = `sean/files/${id}/${file.name}`;
      const storage = getStorage();
      const storageRef = ref(storage, filepath);
      
      // below reference for contentType:
      // https://stackoverflow.com/questions/23714383/what-are-all-the-possible-values-for-http-content-type-header
      
      /////////////// supported types for this application
      // application/json
      // application/pdf
      // application/zip
      // image/gif * no
      // image/jpeg
      // image/png
      // text/csv
      // text/html
      // text/plain

      var file_NameType = fileNameType(file.name);
      var extension = file_NameType[1];
      var applicationTypes = ['json', 'pdf', 'zip'];
      var imageTypes = ['jpg', 'png'];
      var textTypes = ['csv', 'html', 'txt'];
      var content = applicationTypes.includes(extension) ? 'application' : imageTypes.includes(extension) ? 'image' : textTypes.includes(extension) ? 'text' : '';
      
      if(content.length == 0) return;
      content = `${content}/${extension}`;
      const metadata = {
        contentType: content,
      };
      // Upload the file and metadata
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      uploadTask.on('state_changed',
        function(snapshot) {
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          progressBar.style.width = `${progress}%`;
          progressBar.innerText = `${progress}%`;
          console.log('Upload is ' + progress + '% done')

          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
          }
          // resolve();
        },
        function error(err) {
          // A full list of error codes is available at
          // https://firebase.google.com/docs/storage/web/handle-errors
          switch (err.code) {
            case 'storage/unauthorized':
              // User doesn't have permission to access the object
              console.log("User doesn't have permission to access the object");
              break;
            case 'storage/canceled':
              // User canceled the upload
              console.log("User canceled upload");
              break;
            case 'storage/unknown':
              // Unknown error occurred, inspect error.serverResponse
              console.log("Unknown error occurred");
              break;
          }
          reject();
        },
        function complete() {
          // Upload completed successfully, now we can get the download URL
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log('File available at', downloadURL);
          })
        }
      )
    })
  }
  function fileNameType(file_Or_filename) {

    var filename = file_Or_filename instanceof File ? file_Or_filename.name : file_Or_filename;
    var nameType = [];
    var fileDots = filename.split('.');
    var fileType = fileDots[fileDots.length - 1].toLowerCase();
    nameType.push(fileDots.slice(0, fileDots.length - 1).join('.'));
    nameType.push(fileType);
    return nameType;

  }

  // misc firestore
  async function copyFirestore() {

    /////////////// from query -> doc ??
    const destDoc = doc(db, 'reports', 'Ll62xGQgTNfODmdwWBse'); // new
    const q = query(collection(db, 'reports'), where('ContactInfo.Organisation', "==", 'Centre Le Cap'));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((srcDoc) => {
      console.log(srcDoc.id, ' => ', srcDoc.data());
      setDoc(destDoc, srcDoc.data(), { merge:true })
      .then(lambda => {
          console.log(`Document copied successfully`);
      })
      .catch(error => {
          console.log(error);
      })
    });

  }
  async function addReport(reportId, reportJSON) {

    var response = [];
    const destDoc = doc(db, 'reports', reportId);
    await setDoc(destDoc, reportJSON, { merge:true })
    .then(lambda => {
      response.push(true);
      response.push(reportJSON);
    })
    .catch(error => {
      response.push(false);
      response.push(error);
    })
    return response;

  }
  async function updateAccess(latestUserList) {

    var response = [];
    const destDoc = doc(db, 'access', 'b9NbHHku509AEMHjF6Kw'); // update
    var request = await setDoc(destDoc, latestUserList, { merge:true })
    .then(lambda => {
      response.push(true);
      response.push(latestUserList);
    })
    .catch(error => {
      response.push(false);
      response.push(error);
    })
    return response;

  }

}
main();