var outputLeft = document.getElementById("outputarealeft");
var outputRight = document.getElementById("outputarearight");
var TOTAL_CARDS_ON_HAND = 5;
var TOTAL_CARDS_PLAYED = 5;

// Initialize Awesomplete
var _awesompleteOpts = {
    list: card_db()
        .get()
        .map((c) => c.Name), // List is all the cards in the DB
    autoFirst: true, // The first item in the list is selected
    filter: Awesomplete.FILTER_STARTSWITH, // Case insensitive from start of word
};
var handCompletions = {};
for (i = 1; i <= (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); i++) {
    var hand = document.getElementById("hand" + i);
    handCompletions["hand" + i] = new Awesomplete(hand, _awesompleteOpts);
}

function renderCardInputHtml(card) {
    var $cardName = $('<span class="font-bold" />').text(card.Name);
    if (!card._is_on_hand) {
        $cardName.addClass('text-purple-500');
    }

    var $output = $('<li />')
        .attr('data-card-input-id', card._input_hand_id)
        .append('Input: ')
        .append($cardName);
        
    // Return the outer HTML
    return $output[0].outerHTML;
}

// Creates a div for each fusion
function fusesToHTML(fuselist) {
    return fuselist
        .map(function (fusion) {
            var res = '';

            res += `<div class="result-div text-sm">`;
            res += `<ul class="list-decimal pl-8 mb-2">`;
            res += renderCardInputHtml(fusion.card1);
            res += renderCardInputHtml(fusion.card2);
            if (fusion.card3) {
                res += renderCardInputHtml(fusion.card3);
            }

            // var res =
            //     "<div class='result-div text-sm'><ul class=\"list-decimal pl-8 mb-2\" style=\" padding-left: 32px; margin: 0 0 4px 0; \"><li data-card-input-id=\""+ fusion.card1._input_hand_id +"\">Input: " +
            //     '<b>'+ fusion.card1.Name +'</b>' +
            //     "</li><li data-card-input-id=\""+ fusion.card2._input_hand_id +"\">Input: " +
            //     '<b>'+ fusion.card2.Name +'</b>' + '</li>';

            // if (fusion.card3) {
            //     res += "<li data-card-input-id=\""+ fusion.card3._input_hand_id +"\">Input: " + '<b>'+ fusion.card3.Name +'</b>';
            //     res += '</li>';
            // }

            res += '</ul>';

            if (fusion.result) {
                // Equips and Results don't have a result field
                res += "<div style=\" font-weight: bold; margin-bottom: 5px; margin-left: 14px; \">Result: <span class=\"card-fusion-name text-blue-500\">" + fusion.result.Name + '</span>';
                if (isMonster(fusion.result)) {
                    res += " " + formatStats(fusion.result.Attack, fusion.result.Defense);
                } else {
                    res += " [" + cardTypes[fusion.result.Type] + "]";
                }
                res += '</div>';
            }

            res += '<div class="flex items-center">';
            res += '<button type="button" class="fuse-btn bg-indigo-500 text-white active:bg-indigo-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150">Fuse</button>';
            res += '</div>';

            return res + "</div>";
        })
        .join("\n");
}

function getCardByName(cardname) {
    return card_db({ Name: { isnocase: cardname } }).first();
}

// Returns the card with a given ID
function getCardById(id) {
    var card = card_db({ Id: id }).first();
    if (!card) {
        return null;
    }
    return card;
}

function formatStats(attack, defense) {
    return "(" + attack + "/" + defense + ")";
}

// Returns true if the given card is a monster, false if it is magic, ritual,
// trap or equip
function isMonster(card) {
    return card.Type < 20;
}

function checkCard(cardname, infoname) {
    var info = $("#" + infoname);
    var card = getCardByName(cardname);
    if (!card) {
        info.html("Invalid card name");
    } else if (isMonster(card)) {
        info.html(formatStats(card.Attack, card.Defense) + " [" + cardTypes[card.Type] + "]");
    } else {
        info.html("[" + cardTypes[card.Type] + "]");
    }
}

// Checks if the given card is in the list of fusions
// Assumes the given card is an Object with an "Id" field
// TODO: Generalize to take Object, Name (string) or Id (int)
function hasFusion(fusionList, card) {
    return fusionList.some((c) => c.Id === card.Id);
}

function findFusions() {
    var cards = [];

    for (i = 1; i <= (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); i++) {
        var name = $("#hand" + i).val();
        var card = getCardByName(name);
        if (card) {
            var clonedCard = {...card};
            // Because i starts from 1, so 5 is the first 1/2
            clonedCard._is_on_hand = i <= TOTAL_CARDS_ON_HAND;
            clonedCard._input_hand_id = i;
            cards.push(clonedCard);
        }
    }

    var fuses = [];
    var equips = [];

    for (let i = 0; i < (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); i++) {
        var card1 = cards[i];

        // We cannot fuse played card
        if (card1 && !card1._is_on_hand) {
            break;
        }

        for (let j = i + 1; j < cards.length; j++) {
            var card2 = cards[j];

            var equip = equipsList[card1.Id].find((e) => e === card2.Id);
            if (equip) {
                equips.push({ card1: card1, card2: card2 });
            }

            var card12Fusion = fusionsList[card1.Id].find((f) => f.card === card2.Id);
            if (card12Fusion) {
                fuses.push({ card1, card2, result: getCardById(card12Fusion.result) });

                // If card is is played, then we dont need to check the 3rd card
                // Because we cannot use 1 on-hand-card with 2 played cards
                if (!card2._is_on_hand) {
                    // DO NOT break here, because we need to continue to check next played card to see if its fusable
                    continue;
                }

                for (let k = 0; k < (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); k++) {
                    if (k === i || k === j) {
                        continue;
                    }

                    var card3 = cards[k];

                    // Similar idea, we cannot use 2 on hand card with a played card
                    // Because the played card must always be the 1st card to fuse
                    if (!card3 || !card3._is_on_hand) {
                        // Skip to check next card, DO NOT break
                        continue;
                    }

                    var card123Fusion = fusionsList[card12Fusion.result].find((f) => f.card === card3.Id);

                    if (card123Fusion) {
                        fuses.push({ card1, card2, card3, result: getCardById(card123Fusion.result) });
                    }
                }
            }
        }
    }

    // Check backward: check the played card to see if it can be fused with on-hand cards
    // We can fuse 1 play card with one or more on-hand cards
    for (let i = 0; i < (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); i++) {
        var playedCard = cards[i];

        // We only interested in played card (e.g. "_is_on_hand" is false)
        // If not, skip
        if (!playedCard || playedCard._is_on_hand) {
            continue;
        }

        // We have a played card, now check against the on-hand cards
        for (let j = 0; j < (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); j++) {
            var onHandCard1 = cards[j];

            if (!onHandCard1 || !onHandCard1._is_on_hand) {
                continue;
            }

            var fusion1result = fusionsList[playedCard.Id].find((f) => f.card === onHandCard1.Id);

            if (fusion1result) {
                fuses.push({ card1: playedCard, card2: onHandCard1, result: getCardById(fusion1result.result) });

                // Continue check if we can fuse another on-hand card
                for (let k = 0; k < (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); k++) {
                    if (k === j) {
                        continue;
                    }

                    var onHandCard2 = cards[k];

                    // Similar idea, we cannot use 2 on hand card with a played card
                    // Because the played card must always be the 1st card to fuse
                    if (!onHandCard2 || !onHandCard2._is_on_hand) {
                        // Skip to check next card, DO NOT break
                        continue;
                    }

                    var fusion2result = fusionsList[fusion1result.result].find((f) => f.card === onHandCard2.Id);

                    if (fusion2result) {
                        fuses.push({ card1: playedCard, card2: onHandCard1, card3: onHandCard2, result: getCardById(fusion2result.result) });
                    }
                }
            }
        }
    }

    outputLeft.innerHTML = "<h2 class='center'>Fusions:</h2>";
    outputLeft.innerHTML += fusesToHTML(fuses.sort((a, b) => b.result.Attack - a.result.Attack));

    outputRight.innerHTML = "<h2 class='center'>Equips:</h2>";
    outputRight.innerHTML += fusesToHTML(equips);
}

function resultsClear() {
    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";
}

function inputsClear(handCardsOnly) {
    var removeLength = handCardsOnly ? TOTAL_CARDS_ON_HAND : (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED);

    for (i = 1; i <= removeLength; i++) {
        $("#hand" + i).val("");
        $("#hand" + i + "-info").html("");
    }
}

// Set up event listeners for each card input
for (i = 1; i <= (TOTAL_CARDS_ON_HAND + TOTAL_CARDS_PLAYED); i++) {
    $("#hand" + i).on("change", function () {
        handCompletions[this.id].select(); // select the currently highlighted element
        if (this.value === "") {
            // If the box is cleared, remove the card info
            $("#" + this.id + "-info").html("");
        } else {
            checkCard(this.value, this.id + "-info");
        }
        resultsClear();
        findFusions();
    });

    $("#hand" + i).on("awesomplete-selectcomplete", function () {
        checkCard(this.value, this.id + "-info");
        resultsClear();
        findFusions();
    });
}

$("#resetBtn").on("click", function () {
    if (!window.confirm('Are you sure you want to reset all cards')) {
        return;
    }
    resultsClear();
    inputsClear(false);
});

$('#cleanUpBtn').on('click', function () {
    var currentHandCards = [];

    // Only clean the 5 cards on hand
    for (var i = 1; i <= TOTAL_CARDS_ON_HAND; i++) {
        currentHandCards.push($("#hand" + i).val());
    }

    resultsClear();
    inputsClear(true);

    setTimeout(function () {
        currentHandCards.filter(Boolean).forEach((name, handIndex) => {
            var handleInputId = handIndex + 1;
            $("#hand" + handleInputId).val(name).change();
        });
    }, 500);
});

$(document).on('click', '.fuse-btn', function () {
    var $result = $(this).closest('.result-div');
    var resultCardName = $result.find('.card-fusion-name').text().trim();

    // Fill the result card into the next available played card slot
    for (var i = 6; i <= 10; i++) {
        var $playedCardSlot = $('#hand' + i);

        if ($playedCardSlot.val()) { 
            continue;
        }

        $playedCardSlot.val(resultCardName).change();
        break;
    }

    $result.find('li').each(function () {
        var cardInputId = $(this).attr('data-card-input-id');
        $('#hand' + cardInputId).val('').change();
    });

    $('#cleanUpBtn').click();
});