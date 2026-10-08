<?php

namespace MediaWiki\Extension\ReaderExperiments\Experiments\SemanticSearch\Utils\Api;

use MediaWiki\Request\WebRequest;

interface MediaWikiApi {
	/**
	 * @throws Exception
	 */
	public function execute( WebRequest $request ): array;
}
