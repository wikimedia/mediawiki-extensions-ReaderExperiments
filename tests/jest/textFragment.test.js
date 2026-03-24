const {
	createTextFragmentDirective,
	encodeTextFragment
} = require( '../../resources/ext.readerExperiments.shareHighlight/utils/textFragment.js' );

describe( 'encodeTextFragment', () => {

	it( 'passes through empty string', () => {
		expect( encodeTextFragment( '' ) ).toBe( '' );
	} );
	it( 'does percent encoding on spaces', () => {
		expect( encodeTextFragment( 'A short string' ) ).toBe( 'A%20short%20string' );
	} );
	it( 'does percent encoding on CJK', () => {
		expect( encodeTextFragment( '公元508年' ) ).toBe( '%E5%85%AC%E5%85%83508%E5%B9%B4' );
	} );
	it( 'trims space at edges', () => {
		expect( encodeTextFragment( '  A short string  ' ) ).toBe( 'A%20short%20string' );
	} );
	it( 'merges adjacent spaces', () => {
		expect( encodeTextFragment( 'A   short   string' ) ).toBe( 'A%20short%20string' );
	} );
	it( 'Percent-encodes dashes', () => {
		expect( encodeTextFragment( 'Sentinel-2' ) ).toBe( 'Sentinel%2d2' );
	} );
	it( 'Percent-encodes ampersands', () => {
		expect( encodeTextFragment( 'AT&T' ) ).toBe( 'AT%26T' );
	} );
	it( 'Percent-encodes commas', () => {
		expect( encodeTextFragment( 'There, and Back Again' ) ).toBe( 'There%2C%20and%20Back%20Again' );
	} );
	it( 'Percent-encodes multiple dashes', () => {
		expect( encodeTextFragment( 'C--' ) ).toBe( 'C%2d%2d' );
	} );

} );

describe( 'createTextFragmentDirective', () => {

	it( 'does a short string as one text bit', () => {
		expect( createTextFragmentDirective( 'A short string' ) ).toBe( ':~:text=A%20short%20string' );
	} );

	it( 'does a long string as start and end', () => {
		expect( createTextFragmentDirective(
			'This is a much longer string, and really you wouldn\'t even imagine how long it is oh my goodness ' +
			'it is just so very long that not even one line fits it all you have to break it over multiple lines!'
		) ).toBe(
			':~:text=This%20is%20a%20much%20longer,break%20it%20over%20multiple%20lines!'
		);
	} );

	it( 'handles lines with >100 chars and >10 words', () => {
		expect( createTextFragmentDirective(
			'AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC DDDDDDDDDD EEEEEEEEEE FFFFFFFFFF ' +
			'GGGGGGGGGG HHHHHHHHHH IIIIIIIIII JJJJJJJJJJ KKKKKKKKKK LLLLLLLLLL ' +
			'MMMMMMMMMM NNNNNNNNNN OOOOOOOOOO PPPPPPPPPP QQQQQQQQQQ RRRRRRRRRR'
		) ).toBe(
			':~:text=AAAAAAAAAA%20BBBBBBBBBB%20CCCCCCCCCC%20DDDDDDDDDD%20EEEEEEEEEE,' +
			'NNNNNNNNNN%20OOOOOOOOOO%20PPPPPPPPPP%20QQQQQQQQQQ%20RRRRRRRRRR'
		);
	} );

	it( 'handles lines with >100 chars and exactly 10 words', () => {
		expect( createTextFragmentDirective(
			'AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC DDDDDDDDDD EEEEEEEEEE FFFFFFFFFF ' +
			'MMMMMMMMMM NNNNNNNNNN OOOOOOOOOO PPPPPPPPPP QQQQQQQQQQ RRRRRRRRRR'
		) ).toBe(
			':~:text=AAAAAAAAAA%20BBBBBBBBBB%20CCCCCCCCCC%20DDDDDDDDDD%20EEEEEEEEEE,' +
			'NNNNNNNNNN%20OOOOOOOOOO%20PPPPPPPPPP%20QQQQQQQQQQ%20RRRRRRRRRR'
		);
	} );

	it( 'handles lines with >100 chars and <10 words as plain text link without repeating words', () => {
		expect( createTextFragmentDirective(
			'AAAAAAAAAAAAAAAAAAAA BBBBBBBBBBBBBBBBBBBB CCCCCCCCCCCCCCCCCCCC DDDDDDDDDDDDDDDDDDDD ' +
			'NNNNNNNNNNNNNNNNNNNN OOOOOOOOOOOOOOOOOOOO PPPPPPPPPPPPPPPPPPPP QQQQQQQQQQQQQQQQQQQQ'
		) ).toBe(
			':~:text=AAAAAAAAAAAAAAAAAAAA%20BBBBBBBBBBBBBBBBBBBB%20CCCCCCCCCCCCCCCCCCCC%20DDDDDDDDDDDDDDDDDDDD%20' +
			'NNNNNNNNNNNNNNNNNNNN%20OOOOOOOOOOOOOOOOOOOO%20PPPPPPPPPPPPPPPPPPPP%20QQQQQQQQQQQQQQQQQQQQ'
		);
	} );

	it( 'handles shorter cjk', () => {
		expect( createTextFragmentDirective(
			'“Paris”一词源自古代高盧的一個分支：巴黎西人（Parisii），該部落於公元前3世紀於塞納河一帶聚居。'
		) ).toBe(
			':~:text=%E2%80%9CParis%E2%80%9D%E4%B8%80%E8%AF%8D%E6%BA%90%E8%87%AA%E5%8F%A4%E4%BB%A3%E9%AB%98' +
			'%E7%9B%A7%E7%9A%84%E4%B8%80%E5%80%8B%E5%88%86%E6%94%AF%EF%BC%9A%E5%B7%B4%E9%BB%8E%E8%A5%BF%E4%BA%BA%EF%BC%88' +
			'Parisii%EF%BC%89%EF%BC%8C%E8%A9%B2%E9%83%A8%E8%90%BD%E6%96%BC%E5%85%AC%E5%85%83%E5%89%8D3%E4%B8%96%E7%B4%80' +
			'%E6%96%BC%E5%A1%9E%E7%B4%8D%E6%B2%B3%E4%B8%80%E5%B8%B6%E8%81%9A%E5%B1%85%E3%80%82'
		);
	} );

	it( 'handles longer cjk', () => {
		expect( createTextFragmentDirective(
			'巴黎在近1,000年内的時間是西方最大的城市之一[6][7][8]。目前是世界上最重要的政治和文化中心之一，' +
			'在教育、娛樂、時尚、科學、媒體、藝術、金融、政治等方面皆有重大影響力，被認為是世界上最重要的国际大都会之一[9][10][11][12]，' +
			'《中国大百科全书》將其定性为与纽约、伦敦、东京、香港并列的世界五大国际大都市[13]。許多國際組織都將總部設立在巴黎，' +
			'包括聯合國教科文組織、經濟合作與發展組織、國際商會、巴黎俱樂部等。巴黎是全歐綠化程度最高[14]與最宜居城市之一[15]，' +
			'也是全球日常生活開销最高的城市之一[16][17]。巴黎與法蘭西島大區的GDP貢獻總計約佔了法國全國4分之1，在2021年為7,650億歐元[18]，' +
			'據估計為全歐第一大[19]、世界第六大城市經濟體[20]〈按購買力平價PPP調整〉。總共有數十間財富世界500強企業的總部設立在巴黎都會區[21]，' +
			'是歐洲最集中的地區。巴黎市轄區範圍外的商業區拉德芳斯是歐洲最大的中央商務辦公區[22]。巴黎的高等教育機構是歐盟最集中的地區[23]，' +
			'高等教育研究與發展支出也是歐洲最高的地區。巴黎也被認為是世界上最適合研發創新的城市之一[24]。每年有4,200萬人造訪巴黎與鄰近都會區，' +
			'也讓巴黎成為世界上最多觀光客造訪的城市[23]。巴黎與鄰近都會區總共有3,800个法国历史遗迹與4個世界遺產[23]。巴黎也是1989年的歐洲文化之城。' +
			'巴黎在2014年全球城市排名中排名第3位。 地名'
		) ).toBe(
			':~:text=%E5%B7%B4%E9%BB%8E%E5%9C%A8%E8%BF%911%2C000%E5%B9%B4%E5%86%85%E7%9A%84%E6%99%82%E9%96%93%E6%98%AF%E8%A5%BF%E6%96%B9%E6%9C%80%E5%A4%A7,' +
			'%E5%9F%8E%E5%B8%82%E6%8E%92%E5%90%8D%E4%B8%AD%E6%8E%92%E5%90%8D%E7%AC%AC3%E4%BD%8D%E3%80%82%20%E5%9C%B0%E5%90%8D'
		);
	} );

} );
