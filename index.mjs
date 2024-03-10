import axios from 'axios';
import TeleBot from 'telebot';
import limit from 'p-limit';

const GLOBAL_SEND_LIMIT = 1
const USER_CONFIG = []

const GLOBAL_TOKEN_BOT = "6318548166:AAHpw7I4gFc2I8a8KZ4rPnLa8B_bnHXvZ4Y"

// 6537981587:AAHsIt2nWXWyjvGTKrPElYBT0rpMUpArl5c
// 6969179367:AAEqJQU8TPzLb3nWIQhIQUlwaUFStlQoEHQ
// 6867831283:AAHfs25rq9xMPxFMvBWsCBuMHLiU5P8fLog
const bot = new TeleBot({
    token: GLOBAL_TOKEN_BOT,
    usePlugins: ['commandButton']
});

const urls = [
    'http://localhost:7860'
]

const replyMarkupFull = bot.inlineKeyboard([
    [
        bot.inlineButton('Upscale ⬆️ + Adetailer 😘', { callback: '/p_upscale' }),
    ],
    [
        bot.inlineButton('Eliminar ❌', { callback: '/p_delete' })
    ]
]);
const replyMarkupExtra = bot.inlineKeyboard([
    [
        bot.inlineButton('Final Upscale ⬆️', { callback: '/p_extra' }),
    ],
    [
        bot.inlineButton('Eliminar ❌', { callback: '/p_delete' })
    ]
]);
const replyMarkupLess = bot.inlineKeyboard([
    [
        bot.inlineButton('Eliminar ❌', { callback: '/p_delete' })
    ]
]);
const replyMarkupUps = bot.inlineKeyboard([
    [
        bot.inlineButton('Eliminar ❌', { callback: '/p_delete' })
    ]
]);


bot.on('callbackQuery', async (msg) => {
    if (msg.data == '/p_delete') {
        return bot.deleteMessage(msg.message.chat.id, msg.message.message_id)
    }
    else if (msg.data == '/p_upscale') {
        const prompt = msg.message.caption.split('\n')[1].trim()
        const seed = msg.message.caption.split('\n')[3].trim()
        const width = msg.message.caption.split('\n')[5].split(':')[0]
        const height = msg.message.caption.split('\n')[5].split(':')[1]
        await bot.editMessageReplyMarkup({ chatId: msg.message.chat.id, messageId: msg.message.message_id }, { replyMarkup: replyMarkupLess })
        console.log(prompt, seed)
        await procesar(msg.message, { prompt: prompt, seed: seed, width: width, height: height, replyMarkup: replyMarkupLess, replyToMessage: '', mId: msg.message.message_id, ups: true })
        bot.answerCallbackQuery(msg.id);
    }
    else if (msg.data == '/p_repetir') {
        const prompt = msg.message.caption.split('\n')[1].trim()
        const seed = '-1'
        const width = msg.message.caption.split('\n')[5].split(':')[0]
        const height = msg.message.caption.split('\n')[5].split(':')[1]
        try {
            bot.editMessageReplyMarkup({ chatId: msg.message.chat.id, messageId: msg.message.message_id }, { replyMarkup: replyMarkupFull })
        } catch (e) {
            console.log(e)
        }
        console.log(prompt, seed,)
        await procesar(msg.message, { prompt: prompt, seed: seed, width: width, height: height, replyMarkup: replyMarkupLess, replyToMessage: '', repetir: true })
        bot.answerCallbackQuery(msg.id);
    }
    else if (msg.data == '/p_extra') {
        const np = { ...upscale_payload }
        bot.editMessageReplyMarkup({ chatId: msg.message.chat.id, messageId: msg.message.message_id }, { replyMarkup: replyMarkupUps })
        const img = await getTelegramImageBuffer(msg.message.document.file_id);
        np.image = img[0]
        console.log(msg, `\n`, "np = ", np)
        await procesar(msg.message, { extra: true, payload: np, mId: msg.message.message_id })
    }
});

/**
 * Makes a request to the given URLs and returns an array of model names.
 *
 * @param {Object} msg - The message object containing the URLs.
 * @param {Array} msg.urls - An array of URLs to make the requests to.
 * @return {Array} An array of model names.
 */
async function hacerRequestModelo(msg) {
    try {
        const responses = await Promise.all(msg.urls.map(async (url) => {
            const response = await axios.get(`${url}/sdapi/v1/sd-models`);
            const modelo = response.data[0].model_name;
            let pl
            if (!modelo.includes('vae')) {
                if (modelo.includes('dreamshaperXL_turboDpmppSDE') || modelo.includes('juggernautXL_v9Rdphoto2Lightning') || modelo.includes('ultraspiceXLTURBO_v10') || modelo.includes('albedo') || modelo.includes('ultraspiceXLTURBO_v10') || modelo.includes('juggernautXL_v7Rundiffusion'))
                    pl = { sd_vae: 'sdxl_vae.safetensors' }
                else
                    pl = { sd_vae: 'vae-ft-mse-840000-ema-pruned.safetensors' }
                await axios.post(`${url}/sdapi/v1/options`, pl);
            }
            return modelo
        }));
        return responses;
    } catch (error) {
        console.error("Error haciendo la solicitud de modelo:", error.message);
        throw error;
    }
}

const upscale_payload =
{
    "resize_mode": 0,
    "upscaling_resize": 2,
    "upscaler_1": "4xUltrasharp",
}

async function setPayload(msg, button = '') {
    const payload = []
    if (!USER_CONFIG[msg.from.id]) {
        USER_CONFIG[msg.from.id] = {}
    }
    for (let i = 0; i < msg.modelos.length; i++) {
        payload[i] = {}
        if (button != '') {
            USER_CONFIG[msg.from.id].prompt = button.prompt
            USER_CONFIG[msg.from.id].seed = button.seed
            if (!button.repetir) {
                payload[i].seed = button.seed
                USER_CONFIG[msg.from.id].width = button.width
                USER_CONFIG[msg.from.id].height = button.height
                USER_CONFIG[msg.from.id].adetailer = true
                USER_CONFIG[msg.from.id].enable_hr = true
                USER_CONFIG[msg.from.id].n_iter = 1
                USER_CONFIG[msg.from.id].denoising_strength = 0.45
            }
        } else {
            USER_CONFIG[msg.from.id].prompt = msg.text
            USER_CONFIG[msg.from.id].adetailer = false
            USER_CONFIG[msg.from.id].enable_hr = false
            USER_CONFIG[msg.from.id].denoising_strength = USER_CONFIG[msg.from.id].denoising_strength ? USER_CONFIG[msg.from.id].denoising_strength : 0.5
        }
        payload[i].prompt = USER_CONFIG[msg.from.id].prompt
        payload[i].negative_prompt = "boring, unimpressive, mist, fog, smoke, blurry, unsharp, ordinary, mediocrity, mediocre, worst quality, low quality, normal quality, lowres, unfocused, low quality, blurry, ((extra digits, fewer digits)), black and white, monochrome, photoshop, video game, ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, deformed, body out of frame, bad art, bad anatomy, 3d render, double, clones, twins, brothers, same face, repeated person, long neck, make up, ugly, animated, hat, poorly drawn, out of frame, text, watermark, signature, logo, split image, copyright, cartoon, desaturate"
        payload[i].width = USER_CONFIG[msg.from.id].width
        payload[i].height = USER_CONFIG[msg.from.id].height
        payload[i].n_iter = USER_CONFIG[msg.from.id].n_iter
        payload[i].enable_hr = USER_CONFIG[msg.from.id].enable_hr
        payload[i].hr_scale = USER_CONFIG[msg.from.id].hr_scale
        payload[i].denoising_strength = USER_CONFIG[msg.from.id].denoising_strength
        payload[i].adetailer = false
        payload[i].hr_upscaler = "4xUltrasharp"
        payload[i].eta = 1
        let dim = ''
        if (msg.tipo == "photo") {
            const imagen = msg.photo[msg.photo.length - 1]
            payload[i].prompt = msg.text
            payload[i].negative_prompt += 'asian, chinese, japanese, korean. bad-hands-5, EasyNegativeV2, epiCNegative'
            payload[i].init_images = await getTelegramImageBuffer(imagen.file_id);
            dim = ajustarDimensionesImagen(imagen.width, imagen.height)
            payload[i].width = dim.width
            payload[i].height = dim.height
            payload[i].n_iter = USER_CONFIG[msg.from.id].n_iter
            payload[i].adetailer = true
        }
        const modelo = msg.modelos[i];
        if (modelo.includes('epic') || modelo.includes('rev_anima') || modelo.includes('am_i_real')) {
            payload[i].prompt += '<lora:lcm-lora-sdv1-5:1>';
            payload[i].steps = 7;
            payload[i].cfg_scale = 1.5;
            payload[i].sampler_name = 'LCM';
            if (msg.tipo != "photo" && !button) {
                payload[i].width /= 2;
                payload[i].height /= 2;
            }
        } else if (modelo.inclues('juggernautXL_v9Rdphoto2Lightning')) {
            payload[i].steps = 5;
            payload[i].cfg_scale = 2;
            payload[i].sampler_name = 'DPM++ SDE';
        } else if (modelo.includes('dreamshaperXL')) {
            payload[i].steps = 7;
            payload[i].cfg_scale = 2;
            payload[i].sampler_name = 'DPM++ SDE Karras';
        } else if (modelo.includes('pixelwaveturboExcellent_02')) {
            payload[i].steps = 5;
            payload[i].cfg_scale = 3;
            payload[i].sampler_name = 'DPM++ SDE Karras';
        } else if (modelo.includes('rmsdxlHybridTurboXL_orion')) {
            payload[i].steps = 8;
            payload[i].cfg_scale = 2.2;
            payload[i].sampler_name = 'DPM++ SDE Karras';
        } else if (modelo.includes('juggernautXL_v7Rundiffusion')) {
            payload[i].steps = 25;
            payload[i].cfg_scale = 7;
            payload[i].sampler_name = 'DPM++ 2M SDE Karras';
        } else if (modelo.includes('ultraspiceXLTURBO_v10') || modelo.includes('realvisxlV30Turbo')) {
            payload[i].steps = 8;
            payload[i].cfg_scale = 2;
            payload[i].sampler_name = 'DPM++ SDE Karras';
        } else if (modelo.includes('albedobaseXL_v12')) {
            payload[i].prompt += ''
            payload[i].steps = 25;
            payload[i].cfg_scale = 7;
            payload[i].sampler_name = 'DPM++ 2M Karras';
        } else if (modelo.includes('albedobase_xl')) {
            payload[i].negative_prompt += '. bad quality, bad anatomy, worst quality, low quality, low resolution, extra fingers, blur, blurry, ugly, wrong proportions, watermark, image artifacts, lowres, ugly, jpeg artifacts, deformed, noisy image, deformation, skin moles'
            payload[i].steps = 50;
            payload[i].cfg_scale = 5;
            payload[i].sampler_name = 'DPM++ 3M SDE Exponential';
        }
        if (payload[i].enable_hr)
            payload[i].hr_second_pass_steps = Math.round(payload[i].steps / 2)
        if (msg.control) {
            payload[i].denoising_strength = 0.8
            payload[i].alwayson_scripts = payload[i].adetailer
                ? {
                    controlnet: {
                        args: [
                            {
                                enabled: true,
                                module: 'ip-adapter_clip_sdxl_plus_vith', //pre processor
                                // ip-adapter_clip_sd15  1.5
                                model: 'ip-adapter-plus-face_sdxl_vit-h', // modelo
                                // ip-adapter_sd15_vit-G
                                weight: 0.75,
                                image: payload[i].init_images[0],
                                resize_mode: 1,
                                processor_res: dim.width,
                                guidance_start: 0.0,
                                guidance_end: 0.6,
                            },
                        ],
                    },
                    ADetailer: {
                        args: [
                            { ad_model: "mediapipe_face_full", ad_confidence: 0.35 },
                            { ad_model: "mediapipe_face_mesh_eyes_only", ad_confidence: 0.35 },
                            { ad_model: "breasts_seg.pt", ad_confidence: 0.35 },

                        ],
                    },
                }
                : "";
        } else {
            payload[i].alwayson_scripts = payload[i].adetailer
                ? {
                    ADetailer: {
                        args: [
                            { ad_model: "mediapipe_face_full", ad_confidence: 0.35 },
                            { ad_model: "mediapipe_face_mesh_eyes_only", ad_confidence: 0.35 },
                            { ad_model: "breasts_seg.pt", ad_confidence: 0.35 },

                        ],
                    },
                }
                : "";
        }
        if (!payload[i].prompt)
            payload[i].prompt = ''
        if (payload[i].prompt.includes('r_color')) {
            payload[i].prompt = payload[i].prompt.replace('r_color', " {Ruby Red|Sapphire Blue|Emerald Green|Golden Yellow|Amethyst Purple|Crimson Red|Ocean Blue|Forest Green|Sunflower Yellow|Royal Purple|Coral Pink|Turquoise Blue|Olive Green|Topaz Yellow|Lavender Purple|Cherry Blossom Pink|Mint Green|Butterscotch Yellow|Indigo Blue|Pine Green|Marigold Orange|Periwinkle Blue|Moss Green|Tangerine Orange|Teal Blue|Burgundy Red|Sky Blue|Chartreuse Green|Mustard Yellow|Mulberry Purple|Salmon Pink|Steel Gray|Peachy Orange|Cobalt Blue|Jade Green|Lemon Yellow|Mauve Purple|Apricot Orange|Cerulean Blue|Chartreuse Yellow|Plum Purple|Peachy Pink|Minty Blue-Green|Mahogany Brown|Azure Blue|Lilac Purple|Caramel Brown|Cyan Blue|Rose Gold|Midnight Black|Pearlescent White|}")
        }
        if (payload[i].prompt.includes('r_artist')) {
            payload[i].prompt = payload[i].prompt.replace('r_artist', "{Art by Hokusai|Art by Utagawa Hiroshige|Art by Katsushika Oei|Art by Ando Hiroshige|Art by Hiroshi Yoshida|Art by Katsushika Hokusai II|Art by Kanō Tanyū|Art by Kawanabe Kyōsai|Art by Gustave Doré|Art by Alphonse Mucha|Art by Hajime Sorayama|Art by Eyvind Earle|Art by H.R. Giger|Art by Ilya Kuvshinov|Art by Syd Mead|Art by Simon Stålenhag|Art by Boris Vallejo|Art by Roger Dean|Art by Yoko Honda|Art by James Jean|Art by Claude Monet|Art by Vincent van Gogh|Art by Pablo Picasso|Art by Frida Kahlo|Art by Salvador Dalí|Art by Georgia O'Keeffe|Art by Wassily Kandinsky|Art by Jackson Pollock|Art by Andy Warhol|Art by Leonardo da Vinci|Art by Michelangelo|Art by Raphael|Art by Sandro Botticelli|Art by Caravaggio|Art by Rembrandt|Art by Johannes Vermeer|Art by Pieter Bruegel the Elder|Art by Hieronymus Bosch|Art by Titian|Art by Tintoretto|Art by El Greco|Art by Peter Paul Rubens|Art by Jan van Eyck|Art by Francisco Goya|Art by Diego Velázquez|Art by Édouard Manet|Art by Pierre-Auguste Renoir|Art by Amedeo Modigliani|Art by Egon Schiele|Art by Kazimir Malevich|Art by Yayoi Kusama|Art by KAWS|Art by Banksy|Art by Jeff Koons|Art by Ai Weiwei|Art by Yves Klein|Art by Jean-Michel Basquiat|Art by Takashi Murakami|Art by Marina Abramović|Art by Anish Kapoor|Art by Damien Hirst|Art by Jenny Holzer|Art by Olafur Eliasson|Art by David Hockney|Art by Bridget Riley|Art by Antony Gormley|Art by Cindy Sherman|Art by Gerhard Richter|Art by Anselm Kiefer|Art by Barbara Hepworth|Art by Louise Bourgeois|Art by Yinka Shonibare|Art by Subodh Gupta|Art by Xu Bing|Art by Yoshitomo Nara|Art by Murakami Saburo|Art by Lee Ufan|Art by Choi Jeong Hwa|Art by Arin Dwihartanto Sunaryo|Art by Raqib Shaw|Art by Julio Le Parc|Art by Zao Wou-Ki|Art by Lee Krasner|Art by Joan Miró|Art by Max Ernst|Art by Fernand Léger|Art by Paul Klee|Art by René Magritte|Art by Giorgio de Chirico|Art by Marc Chagall}");
        }
        if (payload[i].prompt.includes('r_style')) {
            payload[i].prompt = payload[i].prompt.replace('r_style', " {Origami|Charcoal Drawing|Digital Drawing|Glass Art|Oil Painting|Acrylic Painting|Watercolor|Digital Art|Wood Sculpture|Stone Sculpture|Metal Sculpture|Collage|Etching|Screen Printing|Fine Art Photography|Graffiti|Street Art|Surrealism|Abstract Art|Cubism|Impressionism|Expressionism|Renaissance Art|Baroque Art|Romanticism|Gothic Art|Minimalism|Contemporary Art|Pop Art|Naïve Art|Realism|Conceptual Art|Kitsch Art|Art Deco|Rococo Art|Pre-Raphaelite Art|Post-Impressionism|Art Deco|Fauvism|Dadaism|Constructivism|Futurism|Rococo Art|Classical Art|Neoclassical Art|Fiber Art|Pastel Drawing|Bronze Sculpture|Ceramic Art|Ink Wash Painting|Encaustic Painting|Mosaic Art|Mixed Media Art|Plaster Sculpture|Ice Sculpture|Wire Sculpture|Assemblage|Woodcut Print|Lithography|Alternative Process Photography|Calligraphy|Stencil Art|Land Art|Digital Collage|Op Art|Surrealist Collage|Constructive Realism|Tonalism|Symbolism|Precisionism|Byzantine Art|Kinetic Art|Interactive Art|Installation Art|Environmental Art|Kinetic Sculpture|Hyperrealism|Bio Art|Steampunk Art|New Media Art|Geometric Abstraction|Superflat Art|Outsider Art|Magic Realism|Trompe-l'oeil|Metaphysical Painting|Asiatic Pictorialism|Spatialism|Transgressive Art|Folk Art|Primitive Art|Powerful Art|Vorticism|Situationist International|Classical Realism|Social Realism}")
        }
        if (payload[i].prompt.includes('r_place')) {
            payload[i].prompt = payload[i].prompt.replace('r_place', " {Moon Base Outpost|Enchanted Coral Reef|Cyberpunk Alleyway|Floating Sky Islands|Digital Virtual Reality World|Ancient Egyptian Pyramid|Jungle Canopy Treehouse|Subterranean Cave System|European Medieval Village|Underground Bunker Complex|Pacific Island Volcano|Interstellar Space Station|Arctic Iceberg Landscape|Indian Palace Courtyard|Sunken Pirate Shipwreck|Urban Graffiti Art District|Mayan Temple City|Time-Traveling Victorian Street|Roman Colosseum Arena|Surreal Salvador Dalí Landscape|Holographic Futuristic Mall|Crystal Cavern Haven|Celestial Garden Oasis|Neon Cyberpunk Floating Market|Levitating Cloud Sanctuary|Binary Code Wonderland|Stargate Portal Nexus|Bioluminescent Mushroom Forest|Subaquatic Atlantis Observatory|Steampunk Labyrinth Workshop|Aetherial Library Archive|Aurora Borealis Ice Palace|Galactic Beacon Outpost|Lost City of Echoing Whispers|Floating Lotus Palace|Deserted Time Capsule Capsule|Suspended Animation Art Gallery|Infinite Jungle Canopy Haven|Hidden Subterranean Garden Sanctuary|Uncharted Underground Oasis|Dystopian Urban Underground Hive|Tropical Archipelago Sky Haven|Frozen Nebula Overlook|Mystical Eastern Palace Gardens|Sunken Galleon Graveyard|Urban Dreamscape Graffiti Sanctuary|Ancient Maya Astral Citadel|Victorian Chrono-Plaza|Eternal Roman Colosseum Nexus|Dalí-esque Surreal Dreamscape|Virtual Reality Cyber Mall}")
        }
        if (payload[i].prompt.includes('r_pose')) {
            payload[i].prompt = payload[i].prompt.replace('r_pose', " {Epic Battle Stance|Whimsical Twirling Pose|Sci-Fi Cyborg Stance|Casual Coffee Sipping Pose|Zen Meditation in Nature|Graceful Swan Lake Ballet|Dynamic Parkour Leap|Sassy Catwalk Strut|Pirate Captain Swagger|Samurai Warrior Draw Sword|Yoga Tree Pose|Chilling Hammock Lounging|Serious Detective Investigating|Expressive Posing with Umbrella|Carefree Cartwheel Action|Jumping into Puddle Splash|Artistic Ribbon Dancing|Superhero Flying Pose|Fencing Duel En Garde|Shy Hidden Behind a Book Pose|Elegant Victorian Tea Sipping|Heroic Archery Stance|Enchanted Skipping Through Meadows|Futuristic Hovering Pose|Contemplative Stargazing|Whirling Dervish Dance|Gravity-Defying Aerial Acrobatics|Confident Runway Power Stride|Viking Berserker Battle Roar|Kung Fu Master Martial Arts|Floating Lotus Meditation|Synchronized Swan Lake Water Ballet|Parkour Roof Slide|Playful Cat Chasing Butterflies|Time-Traveling Coffee Sipping|Mindful Yoga on Mountain Peak|Epic Swordmaster Duel|Fashion Catwalk Cat Strut|Swashbuckling Pirate Shipboard Fight|Zen Bookshelf Immersion|Regal Victorian Tea Pouring}")
        }
        if (payload[i].prompt.includes('r_photoType')) {
            payload[i].prompt = payload[i].prompt.replace('r_photoType', " {360-Degree Virtual Tour Photography|Dark and Moody Cinematic Photography|Mirrorless Camera In-Camera Filters|Instant Film Nostalgia Photography|Abstract Light Painting Photography|Vintage Toy Figure Photography|High-Speed Water Balloon Burst|Bird's Eye View Drone Photography|Macro Water Droplet Refraction|Nighttime Fireworks Display Photography|Minimalist Geometric Pattern Photography|Candid Street Art Encounter Photography|Dramatic Sunset Silhouette Photography|Cinematic Film Noir Detective|Extreme Close-Up Eye Photography|Star Trail Astrophotography|Frozen Action Sports Snowflake Photography|Interactive Augmented Reality Photography|Levitation Optical Illusion Photography|Nature's Patterns in Micro Photography|Floating Levitating Objects Photography|360-Degree Underwater Exploration Photography|Moody Urban Exploration Photography|Holga Camera Surreal Photography|Vintage Polaroid Instant Gratification|Impressionist Brushstroke Light Art|Toy Miniature Wonderland Photography|Explosive Water Splash Freeze Frame|Avian Perspective Aerial Photography|Macro Insect World Reflections|Fireworks Abstract Burst Photography|Abstract Architectural Fragmentation|Street Art Human Element Integration|Golden Hour Silhouette Portraits|Noir Film Detective Mystery Scenes|Extreme Macro Pupil Detail Photography|Galactic Star Cluster Photography|Dynamic Action Sports Velocity Capture|Immersive Virtual Reality Photography|Anti-Gravity Levitation Photography|Microscopic Flora and Fauna Patterns|Invisible Levitating Objects Photography}")
        }
        if (payload[i].prompt.includes('r_quality')) {
            payload[i].prompt = payload[i].prompt.replace('r_quality', " {Crisp 8K Ultra High Definition (UHD)|HDR+ Dolby Vision Enhancement|Fine Art Canvas Print Quality|Immersive Virtual Reality (VR)|Ultra-Fine Pixel Detail|Stunning 6K Resolution|Perfectly Balanced Color Grading|High-Fidelity Image Reproduction|Meticulous Retouching Mastery|Hyper-Realistic Textures|Incredible Luminance Range|Pristine Noise-Free Shadows|Radiant Backlit Sun Flare|Sculpted 3D Pop Effect|Astounding Dynamic Range|Color-Accurate Calibrated Display|Masterful Color Grading|Retina-Display Sharpness|Unparalleled Color Depth|Impressive Bokeh Rendering}")
        }
        if (payload[i].prompt.includes('r_photoSetting')) {
            payload[i].prompt = payload[i].prompt.replace('r_photoSetting', " {Telephoto Lens for Wildlife Photography|Smartphone Portrait Mode|High-Key Lighting for Glamour Shots|Low-Key Lighting for Dramatic Effect|Golden Hour for Warm Sunlight|Blue Hour for Twilight Tones|Panning Technique for Motion Blur|Vivid Picture Style for Rich Colors|Soft Focus Lens for Dreamy Look|Star Filter for Sparkling Lights|Silhouette Composition Technique|Back Button Focus for Fast Action|Aerial Perspective for Depth|High ISO for Grainy Texture|Locked Tripod for Long Exposures|Fisheye Lens for Distorted Fun|Monochromatic Split Toning|Wide Dynamic Range Bracketing|Astrotracer for Starry Nightscapes|Tilt-Shift Lens for Miniature Effect}")
        }
        if (payload[i].prompt.includes('r_random')) {
            payload[i].prompt = payload[i].prompt.replace('r_random', ' {SK_3DRENDER|SK_ANALOGFILM|SK_ANIME|SK_CINEMATIC|SK_COMIC|SK_Cyberpunk|SK_DIGITALART|SK_Fantasy|SK_Ghibli|SK_VECTORART}')
        }
    }
    console.log(payload[0].alwayson_scripts.controlnet, "\n\n\nAcá perros\n\n\n")
    return payload
}




async function response_t2i(msg) {
    try {
        const responses = await Promise.all(msg.urls.map(async (url, index) => {
            try {
                if (!msg.payloads[index]) {
                    throw new Error(`Los datos de payload para el índice ${index} no están definidos.`);
                }
                const response = await axios.post(`${url}/sdapi/v1/txt2img`, msg.payloads[index], { timeout: 600000 });
                return response.data;
            } catch (error) {
                console.error(`Error en la solicitud para el índice ${index}:`, error.message);
                throw error;
            }
        }));
        return responses;
    } catch (error) {
        console.error("Error en la respuesta t2t:", error.message);
        throw error;
    }
}

async function getTelegramImageBuffer(fileId) {
    try {
        const fileUrl = `https://api.telegram.org/bot${GLOBAL_TOKEN_BOT}/getFile?file_id=${fileId}`;
        const response = await axios.get(fileUrl);
        const fileInfo = response.data.result;
        const imageUrl = `https://api.telegram.org/file/bot${GLOBAL_TOKEN_BOT}/${fileInfo.file_path}`;
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const imageBase64 = imageBuffer.toString('base64');
        return [imageBase64];
    } catch (error) {
        console.error('Error al obtener el buffer de la imagen:', error);
        throw error;
    }
}

async function response_i2i(msg) {
    try {
        const responses = await Promise.all(msg.urls.map(async (url, index) => {
            console.log(msg.payloads)
            const response = await axios.post(`${url}/sdapi/v1/img2img`, msg.payloads[index], { timeout: 600000 });
            return response.data;
        }));
        return responses;
    } catch (error) {
        console.error("Error en la respuesta i2i:", error.message);
        throw error;
    }
}

function bufferFromImg(img) {
    return Buffer.from(img, 'base64');
}

async function enviarImagenes(msg, button = '', aguarda = '') {
    try {
        if (!msg.response) {
            throw new Error("La propiedad 't2iresponse' es undefined.");
        }
        if (button.extra) {
            msg.upscaled = { ...msg.response }
            const buffer = bufferFromImg(msg.upscaled.data.image)
            await bot.sendDocument(msg.chat.id, buffer, { fileName: `upscaled.png`, replyMarkup: replyMarkupUps, replyToMessage: button.mId });
        }
        const sendImageLimit = limit(GLOBAL_SEND_LIMIT);
        if (!button.extra) {
            await Promise.all(msg.response.map(async (response) => {
                if (!response.images) {
                    throw new Error("La propiedad 'images' en 't2iresponse' es undefined.");
                }
                console.log("Cantidad de imágenes en la respuesta:", response.images.length);
                let index = 0;
                let maxIndex = msg.control ? response.images.length - 1 : response.images.length;
                while (index < maxIndex) {
                    try {
                        await sendImageLimit(async () => {
                            const imagen = response.images[index];
                            const buffer = bufferFromImg(imagen);
                            const prompts = `<b>Prompt</b>\n${JSON.parse(response.info).all_prompts[index].trim().split('<')[0]}`
                            const semilla = `<b>Semilla</b>\n${JSON.parse(response.info).all_seeds[index]}`
                            const resolucion = `<b>Resolución</b>\n${JSON.parse(response.info).width}:${JSON.parse(response.info).height}`
                            console.log(`Enviando imagen ${index + 1} de ${response.images.length}`);
                            let mensaje = ''
                            if (button != '') {
                                if (msg.img2img) {
                                    mensaje = await bot.sendDocument(msg.chat.id, buffer, { fileName: `foto_${index}.png`, caption: `${prompts}\n${semilla}`, parseMode: "HTML", replyMarkup: replyMarkupExtra, replyToMessage: button.mId });
                                    console.log(1)
                                } else {
                                    mensaje = await bot.sendDocument(msg.chat.id, buffer, { fileName: `foto_${index}.png`, caption: `${prompts}\n${semilla}`, parseMode: "HTML", replyMarkup: replyMarkupExtra, replyToMessage: button.mId });
                                    console.log(2)
                                }
                            } else {
                                if (msg.img2img) {
                                    mensaje = await bot.sendDocument(msg.chat.id, buffer, { fileName: `foto_${index}.png`, caption: `${prompts}\n${semilla}`, parseMode: "HTML", replyMarkup: replyMarkupExtra, replyToMessage: button.mId });
                                    console.log(3)
                                } else {
                                    mensaje = await bot.sendDocument(msg.chat.id, buffer, { fileName: `foto_${index}.png`, caption: `${prompts}\n${semilla}\n${resolucion}`, parseMode: "HTML", replyMarkup: replyMarkupFull });
                                    console.log(4)
                                }
                            }
                            mensaje.seed = semilla
                            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>Imagen ${index + 1} enviada con éxito 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });
                            // await new Promise(resolve => setTimeout(resolve, 200));
                        });
                        index++;
                    } catch (error) {
                    }
                }
            }));
        }
        console.log("Todas las imágenes enviadas con éxito");
    } catch (error) {
        console.error("Error al enviar imágenes:", error.message);
        throw error;
    }
}

function procesar(msg, button = '', aguarda = '') {
    return new Promise(async (resolve, reject) => {
        try {
            msg.urls = urls;
            aguarda = await bot.sendMessage(msg.chat.id, `<b>Enviando petición! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps, replyToMessage: msg.message_id });
            msg.modelos = await hacerRequestModelo(msg);
            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>Configurando datos! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });
            msg.payloads = await setPayload(msg, button);
            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>Generando arte! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });
            if (button.extra) {
                msg.response = await axios.post(`${msg.urls[0]}/sdapi/v1/extra-single-image`, button.payload, { timeout: 600000 });
            } else {
                if (msg.tipo == "text" || button) {
                    msg.response = await response_t2i(msg);
                } else {
                    // if (msg.control) {
                    // msg.response = await response_t2i(msg);
                    // } else {
                    // msg.text = msg.caption;
                    msg.img2img = true
                    msg.response = await response_i2i(msg);
                    // }
                }
            }
            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>Enviando imágenes! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });
            await enviarImagenes(msg, button, aguarda);
            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>Terminamos tu arte! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });

            resolve(msg);
        } catch (error) {
            // eliminarMensajeConRetraso(msg.chat.id, "No hay generadores!", "HTML", msg.message_id)
            await bot.editMessageText({ chatId: aguarda.chat.id, messageId: aguarda.message_id }, `<b>No hay generadores! 🦄 @${msg.from.first_name}</b>`, { parseMode: "HTML", replyMarkup: replyMarkupUps });
            console.error("Error durante el procesamiento:", error.message);
            reject(error);
        }
    });
}



function eliminarMensajeConRetraso(chatId, message, parseMode, mId) {
    return new Promise(async (resolve) => {
        try {
            const eliminar = await bot.sendMessage(chatId, message, { parseMode: parseMode });
            setTimeout(() => {
                bot.deleteMessage(chatId, eliminar.message_id)
                console.log('rata 1')
                bot.deleteMessage(chatId, mId)
                resolve(eliminar);
            }, 30000);
        } catch (e) {
            console.log("Error delete mensaje:", e)
        }
    });
}



bot.on(['photo', 'text'], (msg, self) => {
    if (msg.chat.id == -1002012696790 || msg.chat.id == -1002114811769) {
        msg.tipo = self.type == 'command' ? 'text' : 'photo'
        msg.text = msg.tipo == 'photo' ? msg.caption : msg.text
        const prefix = "/imagine ";
        if (!msg.text.startsWith(prefix) && msg.tipo != 'photo') {
            return;
        }
        if (!msg.text) {
            msg.text = '';
        }
        if (msg.tipo == 'photo' && msg.text.startsWith('C')) {
            msg.text = msg.text.replace(/C\s+/i, '');
            msg.control = true
        }
        msg.text = msg.text.replace(/^\/imagine\s+/i, '');
        procesar(msg);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

bot.on('text', async (msg) => {
    if (msg.chat.id == -1002012696790 || msg.chat.id == -1002114811769) {
        if (!USER_CONFIG[msg.from.id]) {
            USER_CONFIG[msg.from.id] = {}
            USER_CONFIG[msg.from.id].width = 1024
            USER_CONFIG[msg.from.id].height = 1024
            USER_CONFIG[msg.from.id].n_iter = 1
            USER_CONFIG[msg.from.id].enable_hr = false
            USER_CONFIG[msg.from.id].hr_scale = 2
            USER_CONFIG[msg.from.id].denoising_strength = 0.5
            USER_CONFIG[msg.from.id].adetailer = false
        }
        const command = msg.text.split(' ');
        if (command[0] === '/hr') {
            if (command.length === 1) {
                USER_CONFIG[msg.from.id].enable_hr = !USER_CONFIG[msg.from.id].enable_hr;
                bot.sendMessage(msg.chat.id, (!USER_CONFIG[msg.from.id].enable_hr ? "<b>HighRes Fix</b>: Apagado para  👎" : "<b>HighRes Fix</b>: Encendido 👍") + ` para @${msg.from.first_name}`, { parseMode: "HTML" });
            } else if (command.length === 2 && /^\d+(\.5)?$/.test(command[1])) {
                const newScale = parseFloat(command[1]);
                const clampedScale = Math.min(4, Math.max(1, newScale));
                USER_CONFIG[msg.from.id].hr_scale = Math.round(clampedScale * 2) / 2;
                bot.sendMessage(msg.chat.id, `<b>HighRes Fix</b>: Escala actualizada a ${USER_CONFIG[msg.from.id].hr_scale} para @${msg.from.first_name} 👍`, { parseMode: "HTML" });
            } else {
                bot.sendMessage(msg.chat.id, 'Uso incorrecto. Ejemplos:\n\n/hr (para cambiar el estado)\n/hr 2 (para cambiar la escala)', { parseMode: "HTML" });
            }
        }
        if (command[0] === '/cantidad') {
            if (command.length === 2 && /^\d+(\.5)?$/.test(command[1])) {
                const newScale = parseFloat(command[1]);
                const clampedScale = Math.min(32, Math.max(1, newScale));
                USER_CONFIG[msg.from.id].n_iter = Math.round(clampedScale * 2) / 2;
                bot.sendMessage(msg.chat.id, `<b>Cantidad de imágenes a generar actualizada!</b>\nAhora: ${USER_CONFIG[msg.from.id].n_iter} para @${msg.from.first_name} 👍`, { parseMode: "HTML" });
            } else {
                bot.sendMessage(msg.chat.id, 'Uso incorrecto. Ejemplos:\n\n/cantidad 2 (para cambiar cantidad de imágenes)', { parseMode: "HTML" });
            }
        }
        if (msg.text.includes("/adetailer")) {
            USER_CONFIG[msg.from.id].adetailer = !USER_CONFIG[msg.from.id].adetailer
            bot.sendMessage(msg.chat.id, (!USER_CONFIG[msg.from.id].adetailer ? "<b>After Detailer</b>: Apagado 👎" : "<b>After Detailer</b>: Encendido 👍") + `para @${msg.from.first_name} `, { parseMode: "HTML" })
        }
        const arMatch = msg.text.match(/\/ar (.+)/);
        if (arMatch) {
            const proporcion = arMatch[1];
            procesarComandoAR(msg, proporcion);
        }
        const resolutionMatch = msg.text.match(/\/resolution (\d+:\d+)/);
        if (resolutionMatch) {
            const dimensions = resolutionMatch[1].split(':');
            if (dimensions.length === 2) {
                let newWidth = parseInt(dimensions[0], 10);
                let newHeight = parseInt(dimensions[1], 10);

                newWidth = Math.ceil(newWidth / 8) * 8;
                newHeight = Math.ceil(newHeight / 8) * 8;

                if (enRango(newWidth) && enRango(newHeight)) {
                    USER_CONFIG[msg.from.id].width = newWidth;
                    USER_CONFIG[msg.from.id].height = newHeight;
                    bot.sendMessage(msg.chat.id, `<b>Resolución actualizada:</b>\n<b>Ancho</b> ${USER_CONFIG[msg.from.id].width}, <b>Alto</b> ${USER_CONFIG[msg.from.id].height} para <b>@${msg.from.first_name}</b> 👍`, { parseMode: "HTML" });
                } else {
                    bot.sendMessage(msg.chat.id, "Las dimensiones deben estar en el rango de 256 a 1536.", { parseMode: "HTML" });
                }
            } else {
                bot.sendMessage(msg.chat.id, "Formato de resolución no válido. Usa /resolution width:height", { parseMode: "HTML" });
            }
        }
        if (command[0] === '/noise') {
            if (command.length === 2 && /^\d+(\.\d+)?$/.test(command[1])) {
                let newNoise = parseFloat(command[1]);
                newNoise = Math.min(0.9, Math.max(0.1, newNoise));
                newNoise = newNoise.toFixed(2);
                USER_CONFIG[msg.from.id].denoising_strength = parseFloat(newNoise);
                bot.sendMessage(msg.chat.id, `<b>Noise</b>: Valor actualizado a ${USER_CONFIG[msg.from.id].denoising_strength} para <b>@${msg.from.first_name}</b> 👍`, { parseMode: "HTML" });
            } else {
                bot.sendMessage(msg.chat.id, 'Uso incorrecto. Ejemplo:\n\n/noise 0.5 (para cambiar el valor de ruido)', { parseMode: "HTML" });
            }
        }
    }
})

function enRango(numero) {
    return numero >= 256 && numero <= 1536;
}

function ajustarDimensionesImagen(width, height) {
    const targetDimension = 1536;
    if (width < targetDimension || height < targetDimension) {
        const ratio = width / height;
        if (width > height) {
            const newWidth = targetDimension;
            const newHeight = Math.round(targetDimension / ratio);
            return { width: newWidth, height: newHeight };
        } else {
            const newHeight = targetDimension;
            const newWidth = Math.round(targetDimension * ratio);
            return { width: newWidth, height: newHeight };
        }
    } else {
        return { width, height };
    }
}


bot.start();