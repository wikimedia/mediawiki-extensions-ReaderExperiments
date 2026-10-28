<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Search;

use CirrusSearch\CirrusConfigNames;
use CirrusSearch\Dispatch\Voter\NamespaceVetoVoter;
use CirrusSearch\Dispatch\Voter\QueryClassVetoVoter;
use CirrusSearch\Dispatch\Voter\SemanticDebugOptionForceVoter;
use CirrusSearch\Parser\BasicQueryClassifier;
use CirrusSearch\Profile\SearchProfileService;

return [
	// Based on CirrusSearch/profiles/QueryDispatchProfiles.config.php;
	// similar to semantic_only_by_query_length, without the query length voter
	'semantic_only' => [
		'default_route' => 'no_execute',
		'routes' => [
			'no_execute' => [ 'context' => SearchProfileService::CONTEXT_NONE ],
			'semantic' => [
				'context' => SearchProfileService::CONTEXT_SEMANTIC,
				'score' => 1.0,
				// No semantic profile means nothing to retrieve with, so the route is left out
				// entirely rather than built and vetoed on every query.
				'requires' => CirrusConfigNames::DefaultSemanticProfile,
				'voters' => [
					// semantic only holds NS_MAIN content
					'namespaces' => [
						'class' => NamespaceVetoVoter::class,
						'params' => [ NamespaceVetoVoter::PARAM_NAMESPACES => [ NS_MAIN ] ],
					],
					// semantic doesn't do special handling for quotes or keywords,
					// it only works on a bag of words.
					'query_classes' => [
						'class' => QueryClassVetoVoter::class,
						'params' => [
							QueryClassVetoVoter::PARAM_CLASSES => [ BasicQueryClassifier::SIMPLE_BAG_OF_WORDS ],
						],
					],
					'debug_option' => [ 'class' => SemanticDebugOptionForceVoter::class ],
				],
			],
		],
	],
];
