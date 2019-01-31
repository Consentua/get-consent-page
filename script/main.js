// http xhr request function for use as a promise 
function makeRequest(opts) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var params = opts.params;
        if (params && typeof params === 'object' && opts.method == 'GET') {
            params = Object.keys(params).map(function (key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }).join('&');
            let url = opts.url + '?' + params;
            xhr.open(opts.method, url);
        } else {
            xhr.open(opts.method, opts.url);
        }
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        if (opts.headers) {
            Object.keys(opts.headers).forEach(function (key) {
                xhr.setRequestHeader(key, opts.headers[key]);
            });
        }
        // We'll need to stringify if we've been given an object
        // If we have a string, this is skipped.
        if (params && typeof params === 'object' && opts.method == 'GET') {
            xhr.send();
        } else if (params && typeof params === 'object' && opts.method == 'POST') {
            xhr.send(JSON.stringify(params));
        } else {
            xhr.send(params);
        }

    });
}

// function to show/hide raw output
function toggleRawHidden() {
    let node = document.getElementById('output-consents-raw');
    if (node.classList.contains('hidden')) {
        node.classList.remove('hidden')
    } else {
        node.classList.add('hidden')
    }
}

// function to clear any previous outputs
function clearOutput(e) {
    let node = document.getElementById('output-consents');
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
    document.getElementById('output-consents-raw').innerHTML = null;
}

// on form submit => get consents
window.addEventListener("load", function () {
    document.getElementById('consent-form').addEventListener("submit", function (e) {
        e.preventDefault(); // prevent form submit

        // show loading bar
        document.getElementById('loading').classList.remove('hidden');

        //remove previous output
        if (document.getElementById('output-consents').hasChildNodes()) clearOutput();

        // get form values
        var consentuaUID = document.getElementById('consentua-uid').value;
        var consentuaCID = document.getElementById('consentua-cid').value;
        var consentuaSID = document.getElementById('consentua-sid').value;

        // if form is not empty
        if (consentuaUID && consentuaCID && consentuaSID) {
            // make api reqests to get consent
            makeRequest({
                    method: 'GET',
                    url: 'https://api.consentua.com/serviceuser/AnonGetServiceUser',
                    params: {
                        "serviceId": consentuaSID,
                        "identifier": consentuaUID
                    },
                    headers: {
                        "Content-type": "application/json"
                    }
                })
                .then(function (res) {
                    return makeRequest({
                            method: 'POST',
                            url: 'https://api.consentua.com/userconsent/AnonGetConsents',
                            params: {
                                "ClientId": consentuaCID,
                                "ServiceId": consentuaSID,
                                "UserId": JSON.parse(res).UserId
                            },
                            headers: {
                                "Content-type": "application/json"
                            }
                        })
                        .then(function (res) {
                            // display consents to user
                            res = JSON.parse(res);
                            if (res.Consent == null && res.Success) {
                                // no consents for user yet
                                console.warn(res)
                                document.getElementById('loading').classList.add('hidden');
                                alert('no consents found for this user')
                            } else if (res.Consent.Purposes.length > 0) {
                                // has consents display
                                document.getElementById('loading').classList.add('hidden');
                                document.getElementById('output').classList.remove('hidden');
                                for (let i = 0; i < res.Consent.Purposes.length; i++) {
                                    let span = document.createElement("span");
                                    span.classList.add("output-purpose");
                                    span.classList.add("purpose-" + res.Consent.Purposes[i].Consent);
                                    span.id = "purpose-" + [i];
                                    span.innerHTML = "Template: " + res.Consent.Purposes[i].ConsentTemplateId + " purpose " + res.Consent.Purposes[i].PurposeId.toString() + ": " + res.Consent.Purposes[i].Consent;
                                    document.getElementById('output-consents').appendChild(span);
                                }
                                document.getElementById('output-consents-raw').innerHTML = JSON.stringify(res, null, 4);
                            } else {
                                // shouldn't get here
                                document.getElementById('loading').classList.add('hidden');
                                console.warn(res)
                            }
                        });
                })
                .catch(function (err) {
                    document.getElementById('loading').classList.add('hidden');
                    alert(err.statusText)
                    console.error('Augh, there was an error!', err.statusText);
                });
        } else {
            document.getElementById('loading').classList.add('hidden');
            alert('please fill in form')
        }
    });
});