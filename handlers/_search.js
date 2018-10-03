const _handler = async function (_query) {
    console.log('Lets try to find something to do with', _query)

    /* Initialize result. */
    let result = null

    /* Initialize success. */
    let success = null

    /* Initialize error. */
    let error = null

    /* Initialize search flag. */
    let search = true

    /* Validate query. */
    if (_query.slice(-1) === '?') {
        _query = _query.slice(0, _query.length - 1)
    }

    switch (_query.toUpperCase()) {
    case 'LOREM':
        result = getLorem()
        success = true
        break
    default:
        error = `Sorry, we coudn't find anything for<br />[ <strong class="text-primary">${_query}</strong> ]`
        success = false
    }

    /* Build package. */
    pkg = { search, result, error, success }

    return pkg
}

function getLorem() {
    return `
    <p>
    Excepteur ita quis, ne se firmissimum. Aliquip relinqueret non mentitum aut qui
    export ubi sint ex offendit velit pariatur non in hic duis constias, e pariatur
    efflorescere ad nulla commodo te esse elit, do incurreret relinqueret, duis
    doctrina incididunt. Export admodum ubi fugiat quae quo esse id senserit e irure
    aut quo noster culpa amet consequat, senserit legam occaecat singulis, et aliqua
    tamen hic nostrud, admodum te admodum, iis ut reprehenderit ad excepteur quorum
    laborum. Ab fore incididunt, te sint quo anim ex non multos ullamco singulis ut
    fabulas transferrem hic laboris.Labore singulis coniunctione ubi quorum
    coniunctione laborum esse constias. Pariatur qui magna mentitum, et sed
    domesticarum, sunt quamquam ea mentitum, ita qui eram malis noster e eiusmod
    illum malis expetendis velit ad nisi firmissimum commodo quorum possumus, enim
    ut e fore senserit de singulis minim commodo pariatur. Nisi mentitum ex proident
    de officia ex quae, singulis quo summis nostrud, noster expetendis eu
    adipisicing. Aliquip illum quem expetendis fore se irure de mentitum e fugiat
    mandaremus nam fore multos, cupidatat nisi fabulas occaecat, se a magna quamquam
    sed e elit arbitrantur ita doctrina illum ita voluptate imitarentur eu ubi
    possumus sempiternum.
    </p>
    <p>
    Aute possumus ne anim multos a a quid deserunt. Aut ita tamen quae quis sed
    ingeniis quae duis aliquip sunt. Se sint voluptatibus, tempor o consequat e
    quem, enim concursionibus mentitum enim excepteur, singulis est aliquip.Veniam
    singulis do nostrud, possumus consectetur sed laboris iis possumus illustriora o
    occaecat in quid qui admodum an tamen, excepteur anim sed arbitror tractavissent
    si duis litteris laborum, te constias o laborum, pariatur distinguantur iis
    cernantur. Ne summis export quis nescius qui noster aut ingeniis ita tempor do
    excepteur ab voluptate, quid ingeniis vidisse non expetendis relinqueret de
    expetendis, possumus sunt offendit constias, do est duis velit tamen, se nisi
    laborum litteris. Ubi amet firmissimum.
    </p>
    <p>
    Commodo ne ipsum. Et amet cillum aliqua proident e id illum proident. Quo noster
    velit a incurreret, ipsum a deserunt ab summis, minim senserit sed
    familiaritatem ubi hic ea illum elit elit. Singulis legam quamquam.Non quid
    fidelissimae, litteris ubi minim. Aute occaecat ita sunt irure. Fore possumus
    concursionibus ex te esse malis eram eiusmod ad eu nam malis admodum in quid hic
    est tamen pariatur, iudicem se arbitror iis sunt doctrina ubi dolor tamen, ubi
    mandaremus despicationes, nostrud e ipsum. Est dolore singulis, senserit labore
    qui officia exquisitaque an de labore fugiat de quamquam, ea veniam iudicem
    incurreret.
    </p>
    <p>
    Nescius te quis ea incurreret eruditionem a incurreret, occaecat quae legam est
    nulla ne eiusmod ne mentitum o enim nescius ingeniis ab occaecat eram possumus
    vidisse, elit mandaremus distinguantur in offendit et consequat. Duis ullamco
    cohaerescant, esse instituendarum appellat quorum incurreret. Nam mandaremus
    arbitrantur a officia quae aute proident esse in vidisse enim eram expetendis
    nulla ab proident an amet. Laboris est quae.Malis cernantur est efflorescere te
    quorum an de tamen fabulas. Non si adipisicing, dolor probant id sempiternum.
    Offendit illum fugiat quo sunt, quamquam irure mandaremus mentitum in si ita
    fugiat illum veniam hic quid in ita duis litteris. Cillum quibusdam
    concursionibus, hic aliqua velit si occaecat se non fugiat quo irure, vidisse
    aute dolore cernantur anim, summis vidisse iis incurreret ita iis multos
    familiaritatem, ita export nisi an deserunt eu legam mentitum consectetur.
    </p>
    <p>
    Ea legam imitarentur, expetendis de eiusmod, aut minim iudicem efflorescere,
    aliqua ex commodo hic magna, hic minim exercitation eu legam ingeniis ex aliquip
    ex qui esse commodo possumus ut illum qui nescius. Voluptate iis incurreret qui
    aut summis domesticarum, singulis transferrem do expetendis, veniam commodo
    praesentibus si possumus exquisitaque se vidisse, velit officia a amet sunt si
    admodum quorum se singulis tractavissent, nescius cillum cernantur. Fore
    illustriora laborum fore consequat eu nostrud arbitrantur a voluptate, qui
    occaecat philosophari hic o commodo illustriora, fore a eiusmod, tamen singulis
    efflorescere, voluptate amet offendit nostrud si quid appellat do arbitror.Est
    ipsum ad dolore, doctrina o quamquam. Enim fabulas tractavissent, possumus culpa
    a litteris exquisitaque si quis probant instituendarum, ut ullamco philosophari.
    Est voluptate sempiternum.
    </p>
    <p>
    Ita incididunt consectetur nam aute voluptatibus nostrud dolore senserit. Aliqua
    non ab dolore possumus ne probant ita sint probant a deserunt multos eiusmod
    cupidatat, consequat iis proident hic voluptate elit se pariatur exquisitaque an
    et quid reprehenderit se mandaremus imitarentur do laborum, eram nostrud id
    noster duis. Ad fugiat in malis aut ea legam ex amet et ab quorum appellat
    philosophari in officia instituendarum ea incididunt. Culpa ad ullamco ex cillum
    ita id enim arbitror ne se enim ubi magna et magna ut nam aute consequat quo ex
    ne arbitrantur qui elit quamquam te proident ubi aut id adipisicing sed sint
    arbitror ab ullamco.Minim ab incurreret ita summis, culpa ne commodo. Quis
    mentitum ad domesticarum. Mandaremus fugiat dolor cupidatat nisi. Dolore de ad
    dolore voluptate.
    </p>
    <p>
    Ne ut minim duis illum ex offendit nisi aliqua hic sunt, quibusdam sint e
    senserit efflorescere, eu sed dolor consequat se nescius elit nostrud mentitum
    ubi expetendis sempiternum ea excepteur, an appellat praetermissum et quid ex
    voluptate. A e dolor quae minim, senserit arbitrantur quo cupidatat. Admodum
    imitarentur te incurreret, deserunt quem sunt commodo multos iis a velit iis
    nisi ab irure doctrina te veniam quem. Ab nostrud ad offendit, tempor iudicem
    deserunt, duis do litteris te quem sed si cillum singulis.Expetendis aut anim,
    offendit noster aute an fugiat in do amet officia domesticarum ne eiusmod fore
    culpa deserunt quid ita quo cillum transferrem ut ita in amet nescius se non et
    cohaerescant, do export elit nam nostrud. E minim tamen sed proident, quo nam
    nisi multos nulla. Amet constias se sint minim, eu sint appellat despicationes.
    </p>
    <p>
    Velit cupidatat do despicationes sed consequat quis culpa a aute, proident iis
    deserunt se ab noster minim nulla laboris. Quibusdam exquisitaque ad incurreret.
    Nulla voluptate ea consequat, id tamen mandaremus se mandaremus hic tempor
    appellat, deserunt iis laboris an dolore a pariatur se laboris elit ipsum do
    dolore aut ubi aliqua voluptate familiaritatem, export pariatur ea
    sempiternum.Veniam eiusmod philosophari, nulla commodo ne malis summis. Si
    litteris ex consequat. Offendit anim o excepteur praesentibus in esse senserit
    familiaritatem, se export eiusmod pariatur aut laborum fidelissimae ab occaecat
    ab aliquip amet te cupidatat adipisicing e hic illum ingeniis, in et quid elit
    quem do quorum incurreret non magna dolor. Quo de dolor offendit, nisi te ad
    quem proident.
    </p>
    <p>
    Tamen in vidisse, sunt cernantur ea labore quae. Commodo exquisitaque si vidisse
    est admodum enim quamquam. Dolor eu id quid cernantur. Labore aut est duis
    constias, commodo quo aute appellat.Deserunt ex deserunt. Quibusdam ea pariatur
    est si noster probant imitarentur. Te nescius et probant. Nostrud quis iis
    ingeniis eruditionem, culpa incididunt imitarentur, quid non commodo te multos,
    legam nescius sed arbitrantur, iudicem ipsum quis pariatur quis, litteris ubi
    labore expetendis aut iis hic sunt quid irure, in export incurreret mandaremus.
    </p>
    <p>
    Ita fugiat eiusmod consequat, eram te ingeniis de fabulas irure amet incurreret
    summis, ipsum laboris quo coniunctione. Sed minim commodo eiusmod iis te fugiat
    eruditionem. Te anim aliquip ullamco, ita doctrina e eiusmod, te eram officia
    proident, nescius export laborum, aliquip nulla laboris e aut sint velit sed
    vidisse ubi legam id est irure expetendis e quis ea hic quorum mentitum.Nulla
    familiaritatem quibusdam tempor senserit. Singulis ab offendit. Ullamco irure si
    fabulas concursionibus quo mentitum noster enim iis tamen, quorum e laboris ubi
    do summis mentitum exquisitaque. Export de arbitror eu irure, in minim et sint,
    voluptate a incididunt e eu duis iudicem comprehenderit.
    </p>
    `
}

module.exports = _handler
