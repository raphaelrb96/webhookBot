"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
const request = require("request"),
    express = require("express"),
    body_parser = require("body-parser"),
    axios = require("axios"),
    app = express().use(body_parser.json()); // creates express http server

const Firestore = require('@google-cloud/firestore');

const path = './amashop-rapha-bf3e3ad049bb.json';

const db = new Firestore({
    projectId: 'amashop-rapha',
    keyFilename: path,
});

app.get('/', (req, res) => {
    const name = process.env.NAME || 'World';
    res.send(`Hello ${name}!`);
});

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
    console.log(`Start: listening on port ${port}`);
});

app.post("/whatsapp", async (req, res) => {
    // Parse the request body from the POST
    let body = req.body;
    const { entry } = body;
    const changes = entry[0].changes;
    const change = changes[0];
    const { value } = change;
    const { messages, metadata, contacts, statuses } = value;

    // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    if (body.object && messages) {


        const msg = messages[0];
        const typeMsg = msg.type;
        const { name } = contacts[0].profile;
        let phone_number_id = metadata.phone_number_id;
        const link = "https://seguro.amashops.com.br/r/QPFD16X4IR";






        if (entry && changes && change && messages && msg && msg.text) {


            //Mensagem de texto recebida

            let from = msg.from; // extract the phone number from the webhook payload
            let msg_body = msg.text.body; // extract the message text from the webhook payload

            const timestampMsg = new Date(Number(msg.timestamp));
            const currentTimestamp = Number(Number.parseFloat(Date.now() / 1000).toFixed(0));
            const tempo = currentTimestamp - timestampMsg;


            const textmsgn = `Mensagem de ${name} (${from}) em ${new Date(Number(msg.timestamp) * 1000).toLocaleString("pt", { timeZone: "America/Manaus" })}: ${msg_body}`;
            console.log(JSON.stringify(textmsgn, null, 2));
            console.log(JSON.stringify(tempo, null, 2));


            if (tempo > 60) {
                return res.sendStatus(200);
            }

            const docRef = db.collection('Contatos').doc(from);

            await docRef.set({
                from,
                msg_body,
                timestampMsg,
                name,
                text: textmsgn,
                timestamp: Date.now()
            }).then(() => console.log("Doc salvo com sucesso")).catch(error => { console.log(JSON.stringify(error)) });


            let url = "https://graph.facebook.com/v12.0/" + phone_number_id + "/messages";



            const menu = {
                messaging_product: "whatsapp",
                to: from,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: `😊 Oi ${name}... Seja muito bem-vindo(a) ao assistente de compras da Amashop \n🔛 Estou online 24 horas para tirar todas suas dúvidas e te ajudar na sua jornada de compra\n\n💖 Sinta-se à vontade fazer todas as perguntas que tiver\n👇 Ou clique no botão que fizer mais sentido pra você\n\n*Em que você tem interesse agora ?* \n`
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: "produtos",
                                    title: "Ver Produtos"
                                }
                            },
                            {
                                type: "reply",
                                reply: {
                                    id: "gerente",
                                    title: "Falar com o Gerente"
                                }
                            }
                        ]
                    }
                }
            };

            const produtos = {
                messaging_product: "whatsapp",
                to: from,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: `🥳 ${name} Estamos com uma promoção imperdivel hoje: \n💇🏻‍♀️ A Escova alisadora campeã de vendas desse ano por um preço super acessível e frete grátis para todo Brasil \n\n👇 Clique no botão abaixo para conferir a oferta com desconto`
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: "escova",
                                    title: "Ver Escova Alisadora"
                                }
                            }
                        ]
                    }
                }
            };

            if (String(msg_body).toLocaleLowerCase().includes('escova alisadora')) {

                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: { body: "⚠️ Promoção acaba em poucos dias, aproveite para comprar agora mesmo no pix, boleto ou cartão\n✈️ Com entrega grátis\n🔐 E 90 dias de garantia\n💲 *Por apenas 97,90* \n\n💥 Restam poucas unidades com desconto\n\n\n👇 Clique no link abaixo para comprar\n\n" + link }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Msg Escova: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            } else if (String(msg_body).toLocaleLowerCase().includes('ver produtos')) {

                axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: produtos,
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            } else if (String(msg_body).toLocaleLowerCase().includes('!ping')) {
                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages",
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: {
                            body: "!pong"
                        }
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer EAAJSDcZAomMIBO21Ud9Sh4ARuQa1Wup3IwXX5EP44sE0cLPBjEkSZA6ZCRTQAA37O4T5tkDuuBTekVUf151IjZCqrJ00RinYnexdGDdhbMg9MlAraMsUD42nd3UyyaeFulEJBf7hUr4Ka2P05YbXUQnbLd8u0cN6XhfuwUcdVeZBs3m9Yxk1FgYtQpvR8Mxw70Xn2mBXNivxnNW81"
                    },
                }).then(() => console.log("Pong: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });
            } else if (String(msg_body).toLocaleLowerCase().includes('falar com o gerente')) {

                axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: { body: "Vou encaminhar seu contato pro nosso gerente e em poucos minutos ele entrará em contato com você" }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });
                axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: "92991933525",
                        text: { body: `${name} ${from} quer falar com o gerente` }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            } else {

                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: menu,
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Menu: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            }

            return res.sendStatus(200);


        } else if (entry && changes && change && messages && msg && typeMsg === "interactive" && msg.interactive.button_reply) {

            const idBtn = msg.interactive.button_reply.id;

            let from = msg.from; // extract the phone number from the webhook payload
            let msg_body = "interactive";

            const timestampMsg = new Date(Number(msg.timestamp)).getTime();
            const currentTimestamp = Number(Number.parseFloat(Date.now() / 1000).toFixed(0));
            const tempo = currentTimestamp - timestampMsg;


            const textmsgn = `Interecao de ${from} no Botão (${idBtn}) em ${new Date(Number(msg.timestamp) * 1000).toLocaleString("pt", { timeZone: "America/Manaus" })}`;
            console.log(JSON.stringify(textmsgn, null, 2));
            console.log(JSON.stringify(tempo, null, 2));


            if (tempo > 60) {
                return res.sendStatus(200);
            }

            const docRef = db.collection('Contatos').doc(from);

            await docRef.set({
                from,
                msg_body,
                timestampMsg,
                name,
                text: textmsgn,
                timestamp: Date.now()
            }).then(() => console.log("Doc salvo com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            const produtos = {
                messaging_product: "whatsapp",
                to: from,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: `🥳 ${name} Estamos com uma promoção imperdivel hoje: \n💇🏻‍♀️ A Escova alisadora campeã de vendas desse ano por um preço super acessível e frete grátis para todo Brasil \n\n👇 Clique no botão abaixo para conferir a oferta com desconto`
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: "escova",
                                    title: "Ver Escova Alisadora"
                                }
                            }
                        ]
                    }
                }
            };


            if (idBtn === "produtos") {

                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: produtos,
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Btn produtos: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            } else if (idBtn === "gerente") {

                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: { body: "Vou encaminhar seu contato pro nosso gerente e em poucos minutos ele entrará em contato com você" }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Btn gerente: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });
                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: "92991933525",
                        text: { body: `${name} ${from} quer falar com o você` }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Msg gerente: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });

            } else if (idBtn === "escova") {
                await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://graph.facebook.com/v12.0/" +
                        phone_number_id +
                        "/messages?access_token=" +
                        token,
                    data: {
                        messaging_product: "whatsapp",
                        to: from,
                        text: {
                            body: "⚠️ Promoção acaba em poucos dias, aproveite para comprar agora mesmo no pix, boleto ou cartão\n✈️ Com entrega grátis\n🔐 E 90 dias de garantia\n💲 *Por apenas 97,90* \n\n💥 Restam poucas unidades com desconto\n\n\n👇 Clique no link abaixo para comprar\n\n"
                                + link
                        }
                    },
                    headers: { "Content-Type": "application/json" },
                }).then(() => console.log("Btn escova: Enviado com sucesso")).catch(error => { console.log(JSON.stringify(error)) });
            }

            return res.sendStatus(200);

        }
        else {
            return res.sendStatus(200);
        }

    } else {
        // Return a '404 Not Found' if event is not from a WhatsApp API
        return res.sendStatus(200);
    }
});

app.get("/whatsapp", (req, res) => {
    /**
     * UPDATE YOUR VERIFY TOKEN
     *This will be the Verify Token value when you set up webhook
    **/
    const verify_token = process.env.VERIFY_TOKEN;

    // Parse params from the webhook verification request
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === verify_token) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});