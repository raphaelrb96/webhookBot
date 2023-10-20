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
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

const path = './amashop-rapha-bf3e3ad049bb.json';

const db = new Firestore({
    projectId: 'amashop-rapha',
    keyFilename: path,
});

const link = "https://seguro.amashops.com.br/r/QPFD16X4IR";


const getObjectData = (modelo, name) => {

    let textBody = '';
    let buttonsActions = [];
    let typeInteractive = 'button';
    let type = 'text';

    switch (modelo) {
        case 'produtos':
            typeInteractive = 'button';
            type = 'interactive';
            textBody = `🥳 ${name} Estamos com uma promoção imperdivel hoje: \n💇🏻‍♀️ A Escova alisadora campeã de vendas desse ano por um preço super acessível e frete grátis para todo Brasil \n\n👇 Clique no botão abaixo para conferir a oferta com desconto`;
            buttonsActions = [
                {
                    type: "reply",
                    reply: {
                        id: "escova",
                        title: "Ver Escova Alisadora"
                    }
                }
            ];
            break;
        case 'escova alisadora':
            typeInteractive = '';
            type = 'text';
            textBody = "⚠️ Promoção acaba em poucos dias, aproveite para comprar agora mesmo no pix, boleto ou cartão\n✈️ Com entrega grátis\n🔐 E 90 dias de garantia\n💲 *Por apenas 97,90* \n\n💥 Restam poucas unidades com desconto\n\n\n👇 Clique no link abaixo para comprar\n\n" + link;
            buttonsActions = null;
            break;
        case 'falar com o gerente':
            typeInteractive = '';
            type = 'text';
            textBody = "Vou encaminhar seu contato pro nosso gerente e em poucos minutos ele entrará em contato com você";
            buttonsActions = null;
            break;
        default:
            typeInteractive = 'button';
            type = 'interactive';
            textBody = `😊 Oi ${name}... Seja muito bem-vindo(a) ao assistente de compras da Amashop \n🔛 Estou online 24 horas para tirar todas suas dúvidas e te ajudar na sua jornada de compra\n\n💖 Sinta-se à vontade fazer todas as perguntas que tiver\n👇 Ou clique no botão que fizer mais sentido pra você\n\n*Em que você tem interesse agora ?* \n`;
            buttonsActions = [
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
            ];
            break;
    }

    return {
        typeInteractive: typeInteractive,
        text: textBody,
        actions: buttonsActions,
        type: type
    };
};

const getDataDialogFlow = (text, payload) => {

    let textBody = text;
    let buttonsActions = [];
    let typeInteractive = 'button';
    let type = 'text';

    if (payload) {

        type = 'interactive';

        if (payload.list) {
            typeInteractive = 'list';
            buttonsActions = payload.list;
        } else {
            typeInteractive = 'button';
            buttonsActions = payload.buttons;
        }

    }

    return {
        typeInteractive: typeInteractive,
        text: textBody,
        actions: buttonsActions,
        type: type
    };
};

const salvarMensagemTexto = (from, name, id, timestampMsg, typeMsg, msg) => {
    const docRef = db.collection('Conversas').doc('Contatos').collection(from).doc(id);
    return docRef.set({
        id: id,
        timestamp: timestampMsg,
        metadata: {
            from: name === 'Amashops' ? '559281414741' : from,
            name
        },
        type: typeMsg,
        message: {
            text: msg
        },
        interactive: null,
        status: null
    });
};

const salvarMensagemInterativa = (from, name, id, timestampMsg, typeMsg, btnType, btnId, text, buttons) => {
    const docRef = db.collection('Conversas').doc('Contatos').collection(from).doc(id);
    return docRef.set({
        id: id,
        timestamp: timestampMsg,
        metadata: {
            from: name === 'Amashops' ? '559281414741' : from,
            name
        },
        type: typeMsg,
        message: null,
        interactive: {
            type: btnType,
            body: {
                text,
                buttons
            },
            buttonId: btnId
        },
        status: null
    });
};

const responderMenssagem = (phone_number_id, from, object) => {

    const { text, type, typeInteractive, actions } = object;


    return axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url:
            "https://graph.facebook.com/v12.0/" +
            phone_number_id +
            "/messages?access_token=" +
            token,
        data: {
            messaging_product: "whatsapp",
            to: from,
            text: { body: text }
        },
        headers: { "Content-Type": "application/json" },
    });
};

const responderMenssagemComFluxos = (phone_number_id, from, object) => {

    const { text, type, typeInteractive, actions } = object;

    return axios({
        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
        url:
            "https://graph.facebook.com/v12.0/" +
            phone_number_id +
            "/messages?access_token=" +
            token,
        data: {
            messaging_product: "whatsapp",
            to: from,
            type: type,
            interactive: {
                type: typeInteractive,
                body: {
                    text: text
                },
                action: {
                    buttons: actions
                }
            }
        },
        headers: { "Content-Type": "application/json" },
    });
};

const sucessBotResposta = async (data, object, from, name) => {

    console.log("DialogFlow enviou resposta");

    const { messages, contacts } = data;
    const msgId = messages[0].id;
    const cnttId = contacts[0].wa_id;
    const currentTimestamp = Number(Number.parseFloat(Date.now() / 1000).toFixed(0));

    if (object.type === 'interactive') {
        await salvarMensagemInterativa(from, 'Amashops', msgId, currentTimestamp, object.type, object.typeInteractive, null, object.text, object.actions).then(() => {
            console.log("Doc salvo com sucesso");
        }).catch(error => {
            console.log(JSON.stringify(error));
        });
    } else {
        await salvarMensagemTexto(from, 'Amashops', msgId, currentTimestamp, object.type, object.text).then(() => {
            console.log("Doc salvo com sucesso");
        }).catch(error => {
            console.log(JSON.stringify(error));
        });
    }


};

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
        const phone_number_id = metadata.phone_number_id;

        const client = new SessionsClient();
        const projectId = 'amashop-rapha';
        const location = 'global';
        const agentId = '626aa698-ab9f-4e89-990f-ff7d113fbfc1';



        if (entry && changes && change && messages && msg && msg.text) {


            //Mensagem de texto recebida

            const from = msg.from; // extract the phone number from the webhook payload
            const idMsg = msg.id;
            const msg_body = msg.text.body; // extract the message text from the webhook payload


            const timestampMsg = new Date(Number(msg.timestamp)).getTime();
            const currentTimestamp = Number(Number.parseFloat(Date.now() / 1000).toFixed(0));
            const tempo = currentTimestamp - timestampMsg;


            const textmsgn = `Mensagem de ${name} (${from}) em ${new Date(Number(msg.timestamp) * 1000).toLocaleString("pt", { timeZone: "America/Manaus" })}: ${msg_body}`;
            console.log(JSON.stringify(textmsgn, null, 2));
            console.log(JSON.stringify(tempo, null, 2));


            if (tempo > 60) {
                return res.sendStatus(200);
            }

            await salvarMensagemTexto(from, name, idMsg, timestampMsg, typeMsg, msg_body).then(() => {
                console.log("Doc salvo com sucesso");
            }).catch(error => {
                console.log(JSON.stringify(error));
            });


            //INICIO DO CODIGO DO DIALOG FLOW

            const sessionPath = client.projectLocationAgentSessionPath(
                projectId,
                location,
                agentId,
                from
            );

            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text: msg_body,
                    },
                    languageCode: "pt-BR",
                },
            };

            const responseFlow = await client.detectIntent(request);

            const objResponseFlow = responseFlow[0]?.queryResult?.responseMessages[0];

            if (objResponseFlow) {
                console.log(JSON.stringify(objResponseFlow));
                const { text, payload } = objResponseFlow;
                const string = text.text[0];
                const respostaObject = getDataDialogFlow(string, null);
                if (payload) {

                    console.log(JSON.stringify(payload));

                    await responderMenssagemComFluxos(phone_number_id, from, respostaObject).then(({ data }) => sucessBotResposta(data, respostaObject, from, name)).catch(error => {
                        console.log(JSON.stringify(error));
                    });

                } else {

                    await responderMenssagem(phone_number_id, from, respostaObject).then(({ data }) => sucessBotResposta(data, respostaObject, from, name)).catch(error => {
                        console.log("DialogFlow sofreu um error");
                        console.log(JSON.stringify(error));
                    });

                }

            }

            return res.sendStatus(200);

            //FIM DO CODIGO DO DIALOG FLOW


        } else if (entry && changes && change && messages && msg && typeMsg === "interactive" && msg.interactive.button_reply) {

            const idBtn = msg.interactive.button_reply.id;
            const titleBtn = msg.interactive.button_reply.title;

            const from = msg.from; // extract the phone number from the webhook payload
            const msg_body = "interactive";
            const idMsg = msg.id;


            const timestampMsg = new Date(Number(msg.timestamp)).getTime();
            const currentTimestamp = Number(Number.parseFloat(Date.now() / 1000).toFixed(0));
            const tempo = currentTimestamp - timestampMsg;


            const textmsgn = `Interecao de ${from} no Botão (${idBtn}) em ${new Date(Number(msg.timestamp) * 1000).toLocaleString("pt", { timeZone: "America/Manaus" })}`;
            console.log(JSON.stringify(textmsgn, null, 2));
            console.log(JSON.stringify(tempo, null, 2));


            if (tempo > 60) {
                return res.sendStatus(200);
            }


            await salvarMensagemInterativa(from, name, idMsg, timestampMsg, typeMsg, msg.interactive.type, idBtn, null, null).then(() => {
                console.log("Doc salvo com sucesso");
            }).catch(error => {
                console.log(JSON.stringify(error));
            });



            //INICIO DO CODIGO DO DIALOG FLOW

            const sessionPath = client.projectLocationAgentSessionPath(
                projectId,
                location,
                agentId,
                from
            );

            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text: titleBtn,
                    },
                    languageCode: "pt-BR",
                },
            };

            const responseFlow = await client.detectIntent(request);

            const objResponseFlow = responseFlow[0]?.queryResult?.responseMessages[0];

            if (objResponseFlow) {
                console.log(JSON.stringify(objResponseFlow));
                const { text, payload } = objResponseFlow;
                const string = text.text[0];
                const respostaObject = getDataDialogFlow(string, null);
                if (payload) {

                    console.log(JSON.stringify(payload));

                    await responderMenssagemComFluxos(phone_number_id, from, respostaObject).then(({ data }) => sucessBotResposta(data, respostaObject, from, name)).catch(error => {
                        console.log(JSON.stringify(error));
                    });

                } else {

                    await responderMenssagem(phone_number_id, from, respostaObject).then(({ data }) => sucessBotResposta(data, respostaObject, from, name)).catch(error => {
                        console.log("DialogFlow sofreu um error");
                        console.log(JSON.stringify(error));
                    });

                }

            }

            return res.sendStatus(200);

            //FIM DO CODIGO DO DIALOG FLOW


        } else {
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